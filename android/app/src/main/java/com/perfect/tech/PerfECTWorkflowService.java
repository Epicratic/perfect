package com.perfect.tech;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PerfECT Background Notification Service
 *
 * Listens in real-time to:
 * 1. Evaluations workflow progression (for free users whose ratings are being advanced by pro accounts)
 * 2. Conversations messages (bidirectional between free clients and pro accounts)
 *
 * Operates autonomously even in sleep/background with native Android notifications.
 */
public class PerfECTWorkflowService extends Service {

    private static final String TAG = "PerfECT_WF_Service";
    public static final String ACTION_START = "com.perfect.tech.ACTION_START_MONITORING";
    public static final String ACTION_STOP  = "com.perfect.tech.ACTION_STOP_MONITORING";
    public static final String EXTRA_EMAIL  = "USER_EMAIL";

    private static final int FOREGROUND_NOTIF_ID = 1001;
    private static final int WORKFLOW_NOTIF_BASE = 2000;
    private static final int MESSAGE_NOTIF_BASE  = 3000;
    private static final int ENTERPRISE_EVAL_NOTIF_BASE = 4000;

    private static final String PREFS_STEPS    = "PerfECT_WorkflowSteps";
    private static final String PREFS_MESSAGES = "PerfECT_Messages";
    private static final String PREFS_ENT_EVALS = "PerfECT_EnterpriseEvals";
    private static final String PREFS_EMAIL    = "PerfECT_Prefs";

    private FirebaseFirestore db;
    private final List<ListenerRegistration> listeners = new ArrayList<>();

    private String monitoredEmail;
    private String monitoredRole;
    private String monitoredName;

    private static final Map<Integer, String> STEP_LABELS = new HashMap<>();
    static {
        STEP_LABELS.put(1, "Demande recue et enregistree");
        STEP_LABELS.put(2, "Examen et verification en cours");
        STEP_LABELS.put(3, "Plan d'action et mesures correctives engagees");
        STEP_LABELS.put(4, "Mise en oeuvre des resolutions sur le terrain");
        STEP_LABELS.put(5, "Demande traitee et cloturee avec succes");
    }

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            createNotificationChannels();
            db = FirebaseFirestore.getInstance();
        } catch (Throwable t) {
            Log.e(TAG, "Error in onCreate", t);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            if (intent != null && ACTION_STOP.equals(intent.getAction())) {
                Log.d(TAG, "Stop requested - removing Firestore listeners and stopping service");
                stopListening();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }

            String email = (intent != null) ? intent.getStringExtra(EXTRA_EMAIL) : null;
            String role  = (intent != null) ? intent.getStringExtra("USER_ROLE") : null;
            String name  = (intent != null) ? intent.getStringExtra("USER_NAME") : null;

            if (email == null || email.isEmpty()) {
                email = getSharedPreferences(PREFS_EMAIL, MODE_PRIVATE).getString("monitored_email", null);
                role  = getSharedPreferences(PREFS_EMAIL, MODE_PRIVATE).getString("monitored_role", "");
                name  = getSharedPreferences(PREFS_EMAIL, MODE_PRIVATE).getString("monitored_name", "");
            }

            if (email == null || email.isEmpty()) {
                Log.w(TAG, "No email provided - stopping service.");
                stopSelf();
                return START_NOT_STICKY;
            }

            getSharedPreferences(PREFS_EMAIL, MODE_PRIVATE).edit()
                    .putString("monitored_email", email)
                    .putString("monitored_role", role != null ? role : "")
                    .putString("monitored_name", name != null ? name : "")
                    .apply();

            monitoredEmail = email.trim().toLowerCase();
            monitoredRole  = (role != null) ? role.trim().toLowerCase() : "";
            monitoredName  = (name != null) ? name.trim() : "";

            Log.d(TAG, "Starting monitoring for: email=" + monitoredEmail + " role=" + monitoredRole + " name=" + monitoredName);

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(FOREGROUND_NOTIF_ID, buildPersistentNotification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
                } else {
                    startForeground(FOREGROUND_NOTIF_ID, buildPersistentNotification());
                }
            } catch (Throwable t) {
                Log.e(TAG, "startForeground error", t);
                try {
                    startForeground(FOREGROUND_NOTIF_ID, buildPersistentNotification());
                } catch (Throwable ignored) {}
            }

            startListening();
        } catch (Throwable t) {
            Log.e(TAG, "Error in onStartCommand", t);
        }

        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            stopListening();
        } catch (Throwable t) {
            Log.e(TAG, "Error in onDestroy", t);
        }
        Log.d(TAG, "Service destroyed");
    }

    private void startListening() {
        if (monitoredEmail == null || monitoredEmail.isEmpty()) return;
        stopListening();

        try {
            final String email = monitoredEmail;
            final String name  = monitoredName;
            Log.d(TAG, "Attaching Firestore listeners for: " + email);

            // 1. Evaluations workflow progression (for free users)
            ListenerRegistration l1 = db.collection("evaluations")
                    .whereEqualTo("authorEmail", email)
                    .addSnapshotListener((snapshots, error) -> {
                        if (error != null) {
                            Log.w(TAG, "Firestore evals listener error: " + error.getMessage());
                            return;
                        }
                        if (snapshots == null || snapshots.isEmpty()) return;

                        try {
                            for (DocumentSnapshot doc : snapshots.getDocuments()) {
                                processEvaluationDocument(doc);
                            }
                        } catch (Throwable t) {
                            Log.e(TAG, "Error iterating evals snapshots", t);
                        }
                    });
            listeners.add(l1);

            // 2. Incoming messages by clientEmail
            ListenerRegistration l2 = db.collection("conversations")
                    .whereEqualTo("clientEmail", email)
                    .addSnapshotListener((snapshots, error) -> {
                        if (error != null) {
                            Log.w(TAG, "Firestore conv clientEmail error: " + error.getMessage());
                            return;
                        }
                        if (snapshots == null || snapshots.isEmpty()) return;

                        try {
                            for (DocumentSnapshot doc : snapshots.getDocuments()) {
                                processConversationDocument(doc);
                            }
                        } catch (Throwable t) {
                            Log.e(TAG, "Error iterating conv clientEmail snapshots", t);
                        }
                    });
            listeners.add(l2);

            // 3. Incoming messages by enterpriseEmail
            ListenerRegistration l3 = db.collection("conversations")
                    .whereEqualTo("enterpriseEmail", email)
                    .addSnapshotListener((snapshots, error) -> {
                        if (error != null) {
                            Log.w(TAG, "Firestore conv enterpriseEmail error: " + error.getMessage());
                            return;
                        }
                        if (snapshots == null || snapshots.isEmpty()) return;

                        try {
                            for (DocumentSnapshot doc : snapshots.getDocuments()) {
                                processConversationDocument(doc);
                            }
                        } catch (Throwable t) {
                            Log.e(TAG, "Error iterating conv enterpriseEmail snapshots", t);
                        }
                    });
            listeners.add(l3);

            // 4. Secondary matching by Name (handles cases where email in doc was empty or 'client')
            if (name != null && !name.isEmpty()) {
                ListenerRegistration l4 = db.collection("conversations")
                        .whereEqualTo("clientName", name)
                        .addSnapshotListener((snapshots, error) -> {
                            if (error != null || snapshots == null || snapshots.isEmpty()) return;
                            try {
                                for (DocumentSnapshot doc : snapshots.getDocuments()) {
                                    processConversationDocument(doc);
                                }
                            } catch (Throwable t) {
                                Log.e(TAG, "Error iterating conv clientName snapshots", t);
                            }
                        });
                listeners.add(l4);

                ListenerRegistration l5 = db.collection("conversations")
                        .whereEqualTo("enterpriseName", name)
                        .addSnapshotListener((snapshots, error) -> {
                            if (error != null || snapshots == null || snapshots.isEmpty()) return;
                            try {
                                for (DocumentSnapshot doc : snapshots.getDocuments()) {
                                    processConversationDocument(doc);
                                }
                            } catch (Throwable t) {
                                Log.e(TAG, "Error iterating conv enterpriseName snapshots", t);
                            }
                        });
                listeners.add(l5);
            }

            // 5. Incoming evaluations for enterprise accounts
            if (name != null && !name.isEmpty()) {
                final boolean[] isInitial1 = new boolean[]{true};
                ListenerRegistration l6 = db.collection("evaluations")
                        .whereEqualTo("targetEntity", name)
                        .addSnapshotListener((snapshots, error) -> {
                            if (error != null || snapshots == null || snapshots.isEmpty()) {
                                isInitial1[0] = false;
                                return;
                            }
                            try {
                                for (DocumentSnapshot doc : snapshots.getDocuments()) {
                                    processIncomingEnterpriseEvaluation(doc, isInitial1[0]);
                                }
                            } catch (Throwable t) {
                                Log.e(TAG, "Error iterating incoming enterprise evals targetEntity", t);
                            } finally {
                                isInitial1[0] = false;
                            }
                        });
                listeners.add(l6);

                final boolean[] isInitial2 = new boolean[]{true};
                ListenerRegistration l7 = db.collection("evaluations")
                        .whereEqualTo("actorName", name)
                        .addSnapshotListener((snapshots, error) -> {
                            if (error != null || snapshots == null || snapshots.isEmpty()) {
                                isInitial2[0] = false;
                                return;
                            }
                            try {
                                for (DocumentSnapshot doc : snapshots.getDocuments()) {
                                    processIncomingEnterpriseEvaluation(doc, isInitial2[0]);
                                }
                            } catch (Throwable t) {
                                Log.e(TAG, "Error iterating incoming enterprise evals actorName", t);
                            } finally {
                                isInitial2[0] = false;
                            }
                        });
                listeners.add(l7);
            }

            if (email != null && !email.isEmpty()) {
                final boolean[] isInitial3 = new boolean[]{true};
                ListenerRegistration l8 = db.collection("evaluations")
                        .whereEqualTo("enterpriseEmail", email)
                        .addSnapshotListener((snapshots, error) -> {
                            if (error != null || snapshots == null || snapshots.isEmpty()) {
                                isInitial3[0] = false;
                                return;
                            }
                            try {
                                for (DocumentSnapshot doc : snapshots.getDocuments()) {
                                    processIncomingEnterpriseEvaluation(doc, isInitial3[0]);
                                }
                            } catch (Throwable t) {
                                Log.e(TAG, "Error iterating incoming enterprise evals enterpriseEmail", t);
                            } finally {
                                isInitial3[0] = false;
                            }
                        });
                listeners.add(l8);
            }

            Log.d(TAG, "Attached " + listeners.size() + " active Firestore listeners");
        } catch (Throwable t) {
            Log.e(TAG, "Error in startListening", t);
        }
    }

    private void stopListening() {
        try {
            for (ListenerRegistration lr : listeners) {
                if (lr != null) lr.remove();
            }
            listeners.clear();
            Log.d(TAG, "All Firestore listeners removed");
        } catch (Throwable t) {
            Log.e(TAG, "Error removing listeners", t);
        }
    }

    // ── Evaluations Workflow Logic ───────────────────────────────────────────

    private void processEvaluationDocument(DocumentSnapshot doc) {
        if (doc == null) return;
        try {
            String evalId = doc.getId();
            if (evalId == null || evalId.isEmpty()) return;

            int currentStep = 0;
            try {
                Object stepObj = doc.get("workflowStep");
                if (stepObj instanceof Long)        currentStep = ((Long) stepObj).intValue();
                else if (stepObj instanceof Number) currentStep = ((Number) stepObj).intValue();
                else if (stepObj instanceof String) currentStep = Integer.parseInt((String) stepObj);
            } catch (Throwable ignored) {}

            int prevStep = getStoredStep(evalId);

            if (prevStep == -1) {
                Log.d(TAG, "First observation for eval " + evalId + " step=" + currentStep + " - storing baseline");
                storeStep(evalId, currentStep);
                return;
            }

            if (currentStep > prevStep && currentStep > 0) {
                String entity = safeString(doc, "targetEntity", "actorName", "entity");
                if (entity == null || entity.isEmpty()) entity = "L'etablissement";

                String sector = safeString(doc, "sectorName", "sector", "macroSector");
                String subSector = safeString(doc, "mesoSector", "subSector");
                String pillar = safeString(doc, "pillar", "societalPillar");
                String kpi = safeString(doc, "indicatorType", "type", "kpi", "category", "indicatorCategory");
                String comment = safeString(doc, "comment");
                String locality = safeString(doc, "locality", "region", "location");

                Double ratingVal = null;
                try {
                    Object rObj = doc.get("rating");
                    if (rObj == null) rObj = doc.get("score");
                    if (rObj instanceof Number) ratingVal = ((Number) rObj).doubleValue();
                    else if (rObj instanceof String) ratingVal = Double.parseDouble((String) rObj);
                } catch (Throwable ignored) {}

                String stepLabel = STEP_LABELS.containsKey(currentStep)
                        ? STEP_LABELS.get(currentStep)
                        : "Etape " + currentStep + "/5";

                String title = entity + " a mis a jour votre demande";

                String summaryParts = "";
                if (subSector != null && !subSector.isEmpty()) {
                    summaryParts = subSector;
                } else if (sector != null && !sector.isEmpty()) {
                    summaryParts = sector;
                }
                if (kpi != null && !kpi.isEmpty()) {
                    summaryParts = summaryParts.isEmpty() ? kpi : (summaryParts + " - " + kpi);
                }
                if (ratingVal != null && ratingVal > 0) {
                    double rounded = Math.round(ratingVal * 10.0) / 10.0;
                    summaryParts = summaryParts.isEmpty() ? (rounded + "/5") : (summaryParts + " (" + rounded + "/5)");
                }

                String body = "Etape " + currentStep + "/5 : " + stepLabel + (summaryParts.isEmpty() ? "" : " - " + summaryParts);

                StringBuilder bigText = new StringBuilder();
                bigText.append("Etape ").append(currentStep).append("/5 : ").append(stepLabel);
                if (subSector != null && !subSector.isEmpty()) {
                    bigText.append("\nSous-secteur : ").append(subSector);
                } else if (sector != null && !sector.isEmpty()) {
                    bigText.append("\nSecteur : ").append(sector);
                }
                if (pillar != null && !pillar.isEmpty()) {
                    bigText.append("\nPerformance : ").append(pillar);
                }
                if (kpi != null && !kpi.isEmpty()) {
                    bigText.append("\nIndicateur : ").append(kpi);
                }
                if (ratingVal != null && ratingVal > 0) {
                    bigText.append("\nNote : ").append(Math.round(ratingVal * 10.0) / 10.0).append("/5");
                }
                if (locality != null && !locality.isEmpty()) {
                    bigText.append(" | Localisation : ").append(locality);
                }
                if (comment != null && !comment.trim().isEmpty()) {
                    String trimmed = comment.trim();
                    if (trimmed.length() > 90) trimmed = trimmed.substring(0, 87) + "...";
                    bigText.append("\nCommentaire : \"").append(trimmed).append("\"");
                }

                Log.d(TAG, "Workflow advanced " + prevStep + " -> " + currentStep + " for eval " + evalId);
                showWorkflowNotification(evalId, title, body, bigText.toString());
            }

            storeStep(evalId, currentStep);
        } catch (Throwable t) {
            Log.e(TAG, "Error in processEvaluationDocument", t);
        }
    }

    // ── Conversations Messaging Logic ────────────────────────────────────────

    private void processConversationDocument(DocumentSnapshot doc) {
        if (doc == null) return;
        try {
            String convId = doc.getId();
            if (convId == null || convId.isEmpty()) return;

            String clientEmail = safeString(doc, "clientEmail");
            String entEmail    = safeString(doc, "enterpriseEmail");
            String clientName  = safeString(doc, "clientName");
            String entName     = safeString(doc, "enterpriseName");

            final String myEmail = (monitoredEmail != null) ? monitoredEmail : "";
            final String myName  = (monitoredName != null)  ? monitoredName.toLowerCase().trim() : "";
            final String myRole  = (monitoredRole != null)  ? monitoredRole.toLowerCase().trim() : "";

            // Determine if the monitored device is the Client or the Enterprise
            boolean isClient = false;
            boolean isEnterprise = false;

            if (clientEmail != null && clientEmail.equalsIgnoreCase(myEmail)) {
                isClient = true;
            } else if (entEmail != null && entEmail.equalsIgnoreCase(myEmail)) {
                isEnterprise = true;
            } else if (!myName.isEmpty() && clientName != null && clientName.trim().toLowerCase().equals(myName)) {
                isClient = true;
            } else if (!myName.isEmpty() && entName != null && entName.trim().toLowerCase().equals(myName)) {
                isEnterprise = true;
            } else if (myRole.contains("entreprise")) {
                isEnterprise = true;
            } else {
                isClient = true;
            }

            Boolean unread = null;
            if (isClient) {
                unread = doc.getBoolean("unreadForClient");
            } else {
                unread = doc.getBoolean("unreadForEnterprise");
            }

            String lastMsg   = safeString(doc, "lastMessage");
            String lastMsgId = safeString(doc, "lastMessageId");
            Long lastTime    = doc.getLong("lastUpdatedSeconds");
            long currentTimeVal = (lastTime != null) ? lastTime : (System.currentTimeMillis() / 1000);

            String storedMsgKey = getStoredMessageKey(convId);
            String currentMsgKey = (lastMsgId != null && !lastMsgId.isEmpty()) ? lastMsgId : (convId + "_" + currentTimeVal);

            String senderRole = safeString(doc, "lastSenderRole");
            String senderName = safeString(doc, "lastSenderName");

            // Verify if the message was sent by the OTHER party
            boolean sentByOther = isClient
                    ? ("entreprise".equalsIgnoreCase(senderRole) || (!"contributeur".equalsIgnoreCase(senderRole) && senderRole != null))
                    : ("contributeur".equalsIgnoreCase(senderRole) || (!"entreprise".equalsIgnoreCase(senderRole) && senderRole != null));

            if (senderRole == null || senderRole.isEmpty()) {
                sentByOther = Boolean.TRUE.equals(unread);
            }

            long nowSec = System.currentTimeMillis() / 1000;
            boolean isRecent = Math.abs(nowSec - currentTimeVal) < 1800; // Sent within last 30 minutes

            // CASE 1: First time observing this conversation
            if (storedMsgKey == null || storedMsgKey.isEmpty()) {
                // If it is unread, recent, and from the other party -> this is a fresh new message! NOTIFY!
                if (Boolean.TRUE.equals(unread) && isRecent && sentByOther) {
                    Log.d(TAG, "New incoming conversation message detected on baseline: " + convId);
                    triggerConversationNotification(convId, isClient, entName, clientName, senderName, lastMsg);
                } else {
                    Log.d(TAG, "Baseline stored for conv " + convId + " - key: " + currentMsgKey);
                }
                storeMessageKey(convId, currentMsgKey);
                return;
            }

            // CASE 2: Conversation updated with a new message
            if (!currentMsgKey.equals(storedMsgKey)) {
                if (sentByOther || Boolean.TRUE.equals(unread)) {
                    Log.d(TAG, "New message key detected (" + storedMsgKey + " -> " + currentMsgKey + ") in conv " + convId);
                    triggerConversationNotification(convId, isClient, entName, clientName, senderName, lastMsg);
                }
                storeMessageKey(convId, currentMsgKey);
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error in processConversationDocument", t);
        }
    }

    private void triggerConversationNotification(String convId, boolean isClient, String entName, String cliName, String senderName, String lastMsg) {
        String title;
        String body = (lastMsg != null && !lastMsg.isEmpty()) ? ("\"" + lastMsg + "\"") : "Nouveau message recu";
        String partnerName;

        if (isClient) {
            partnerName = (entName != null && !entName.isEmpty()) ? entName : ((senderName != null && !senderName.isEmpty()) ? senderName : "L'etablissement");
            title = "💬 " + partnerName + " vous a envoye un message";
        } else {
            partnerName = (cliName != null && !cliName.isEmpty()) ? cliName : ((senderName != null && !senderName.isEmpty()) ? senderName : "Un client");
            title = "💬 " + partnerName + " a repondu a votre message";
        }

        Log.d(TAG, "Displaying message notification for conv " + convId + ": " + title);
        showMessageNotification(convId, title, body, partnerName);
    }

    // ── Incoming Enterprise Evaluations Logic ─────────────────────────────────

    private void processIncomingEnterpriseEvaluation(DocumentSnapshot doc, boolean isInitial) {
        if (doc == null) return;
        try {
            String evalId = doc.getId();
            if (evalId == null || evalId.isEmpty()) return;

            // Prevent self-notification if this enterprise authored the rating
            String authorEmail = safeString(doc, "authorEmail", "email");
            if (authorEmail != null && monitoredEmail != null && authorEmail.equalsIgnoreCase(monitoredEmail)) {
                return;
            }

            // Check if already notified
            boolean alreadyNotified = isEnterpriseEvalNotified(evalId);
            if (alreadyNotified) return;

            long createdSec = 0;
            try {
                com.google.firebase.Timestamp ts = doc.getTimestamp("createdAt");
                if (ts != null) createdSec = ts.getSeconds();
            } catch (Throwable ignored) {}
            if (createdSec == 0) {
                try {
                    Object csObj = doc.get("createdAtSeconds");
                    if (csObj instanceof Number) createdSec = ((Number) csObj).longValue();
                } catch (Throwable ignored) {}
            }

            long nowSec = System.currentTimeMillis() / 1000;
            boolean isRecent = (createdSec > 0) && (Math.abs(nowSec - createdSec) < 300); // 5 minutes

            if (isInitial) {
                // If it's the initial batch when service starts, only notify if brand new (last 5 min)
                storeEnterpriseEvalNotified(evalId);
                if (isRecent) {
                    Log.d(TAG, "Recent evaluation detected on initial batch for pro account: " + evalId);
                    triggerEnterpriseEvaluationNotification(doc, evalId);
                } else {
                    Log.d(TAG, "Historical evaluation baseline stored for pro account: " + evalId);
                }
                return;
            }

            // Real-time addition while service is running -> NOTIFY!
            Log.d(TAG, "New incoming evaluation received for enterprise account: " + evalId);
            storeEnterpriseEvalNotified(evalId);
            triggerEnterpriseEvaluationNotification(doc, evalId);
        } catch (Throwable t) {
            Log.e(TAG, "Error in processIncomingEnterpriseEvaluation", t);
        }
    }

    private void triggerEnterpriseEvaluationNotification(DocumentSnapshot doc, String evalId) {
        try {
            String authorName = safeString(doc, "authorName", "author");
            if (authorName == null || authorName.isEmpty()) authorName = "Un contributeur";

            String sector = safeString(doc, "sectorName", "sector", "macroSector");
            String subSector = safeString(doc, "mesoSector", "subSector");
            String pillar = safeString(doc, "pillar", "societalPillar");
            String kpi = safeString(doc, "indicatorType", "type", "kpi", "category", "indicatorCategory");
            String comment = safeString(doc, "comment");
            String locality = safeString(doc, "locality", "region", "location");

            Double ratingVal = null;
            try {
                Object rObj = doc.get("rating");
                if (rObj == null) rObj = doc.get("score");
                if (rObj instanceof Number) ratingVal = ((Number) rObj).doubleValue();
                else if (rObj instanceof String) ratingVal = Double.parseDouble((String) rObj);
            } catch (Throwable ignored) {}

            String ratingStr = (ratingVal != null && ratingVal > 0)
                    ? (Math.round(ratingVal * 10.0) / 10.0) + "/5"
                    : "5/5";

            String title = "⭐ Nouvelle evaluation recue de " + authorName;
            String subDesc = (subSector != null && !subSector.isEmpty()) ? subSector : (sector != null ? sector : "Performance");
            String body = "Note : " + ratingStr + " - " + subDesc;

            StringBuilder bigText = new StringBuilder();
            bigText.append("Note : ").append(ratingStr);
            bigText.append("\nContributeur : ").append(authorName);
            if (subSector != null && !subSector.isEmpty()) {
                bigText.append("\nSous-secteur : ").append(subSector);
            } else if (sector != null && !sector.isEmpty()) {
                bigText.append("\nSecteur : ").append(sector);
            }
            if (pillar != null && !pillar.isEmpty()) {
                bigText.append("\nPerformance : ").append(pillar);
            }
            if (kpi != null && !kpi.isEmpty()) {
                bigText.append("\nIndicateur : ").append(kpi);
            }
            if (locality != null && !locality.isEmpty()) {
                bigText.append("\nLocalisation : ").append(locality);
            }
            if (comment != null && !comment.trim().isEmpty()) {
                String trimmed = comment.trim();
                if (trimmed.length() > 90) trimmed = trimmed.substring(0, 87) + "...";
                bigText.append("\nCommentaire : \"").append(trimmed).append("\"");
            }

            showEnterpriseEvalNotification(evalId, title, body, bigText.toString());
        } catch (Throwable t) {
            Log.e(TAG, "Error in triggerEnterpriseEvaluationNotification", t);
        }
    }

    // ── SharedPreferences Helpers ────────────────────────────────────────────

    private int getStoredStep(String evalId) {
        if (evalId == null) return -1;
        try {
            return getSharedPreferences(PREFS_STEPS, MODE_PRIVATE).getInt("step_" + evalId, -1);
        } catch (Throwable t) {
            return -1;
        }
    }

    private void storeStep(String evalId, int step) {
        if (evalId == null) return;
        try {
            getSharedPreferences(PREFS_STEPS, MODE_PRIVATE).edit().putInt("step_" + evalId, step).apply();
        } catch (Throwable ignored) {}
    }

    private String getStoredMessageKey(String convId) {
        if (convId == null) return null;
        try {
            return getSharedPreferences(PREFS_MESSAGES, MODE_PRIVATE).getString("msg_" + convId, null);
        } catch (Throwable t) {
            return null;
        }
    }

    private void storeMessageKey(String convId, String key) {
        if (convId == null || key == null) return;
        try {
            getSharedPreferences(PREFS_MESSAGES, MODE_PRIVATE).edit().putString("msg_" + convId, key).apply();
        } catch (Throwable ignored) {}
    }

    private boolean isEnterpriseEvalNotified(String evalId) {
        if (evalId == null) return false;
        try {
            return getSharedPreferences(PREFS_ENT_EVALS, MODE_PRIVATE).getBoolean("notif_" + evalId, false);
        } catch (Throwable t) {
            return false;
        }
    }

    private void storeEnterpriseEvalNotified(String evalId) {
        if (evalId == null) return;
        try {
            getSharedPreferences(PREFS_ENT_EVALS, MODE_PRIVATE).edit().putBoolean("notif_" + evalId, true).apply();
        } catch (Throwable ignored) {}
    }

    // ── Notifications Builders ────────────────────────────────────────────────

    private Notification buildPersistentNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT |
                        (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        return new NotificationCompat.Builder(this, "perfect_monitor_channel")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("PerfECT")
                .setContentText("Surveillance active des evaluations et messages")
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .setAutoCancel(false)
                .setSilent(true)
                .setContentIntent(pendingIntent)
                .build();
    }

    private void showWorkflowNotification(String evalId, String title, String body, String bigText) {
        try {
            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openIntent.putExtra("NOTIFICATION_PAYLOAD", "{\"type\":\"workflow\",\"evalId\":\"" + (evalId != null ? evalId : "") + "\"}");

            int notifId = WORKFLOW_NOTIF_BASE + (evalId != null ? Math.abs(evalId.hashCode() % 1000) : 1);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this, notifId, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT |
                        (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MainActivity.NOTIFICATION_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(bigText != null ? bigText : body))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            NotificationManagerCompat nm = NotificationManagerCompat.from(this);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                    checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                            == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                nm.notify(notifId, builder.build());
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error showing workflow notification", t);
        }
    }

    private void showMessageNotification(String convId, String title, String body, String partnerName) {
        try {
            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            String escapedPartner = partnerName != null ? partnerName.replace("\"", "\\\"") : "";
            openIntent.putExtra("NOTIFICATION_PAYLOAD", "{\"type\":\"message\",\"convId\":\"" + (convId != null ? convId : "") + "\",\"partnerName\":\"" + escapedPartner + "\"}");

            int notifId = MESSAGE_NOTIF_BASE + (convId != null ? Math.abs(convId.hashCode() % 1000) : 2);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this, notifId, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT |
                        (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MainActivity.NOTIFICATION_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            NotificationManagerCompat nm = NotificationManagerCompat.from(this);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                    checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                            == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                nm.notify(notifId, builder.build());
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error showing message notification", t);
        }
    }

    private void showEnterpriseEvalNotification(String evalId, String title, String body, String bigText) {
        try {
            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openIntent.putExtra("NOTIFICATION_PAYLOAD", "{\"type\":\"new_eval\",\"evalId\":\"" + (evalId != null ? evalId : "") + "\"}");

            int notifId = ENTERPRISE_EVAL_NOTIF_BASE + (evalId != null ? Math.abs(evalId.hashCode() % 1000) : 3);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this, notifId, openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT |
                            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MainActivity.NOTIFICATION_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(bigText != null ? bigText : body))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            NotificationManagerCompat nm = NotificationManagerCompat.from(this);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                    checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                            == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                nm.notify(notifId, builder.build());
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error showing enterprise eval notification", t);
        }
    }

    private void createNotificationChannels() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager nm = getSystemService(NotificationManager.class);
                if (nm == null) return;

                NotificationChannel monitorChannel = new NotificationChannel(
                        "perfect_monitor_channel",
                        "PerfECT Surveillance",
                        NotificationManager.IMPORTANCE_MIN
                );
                monitorChannel.setDescription("Indique que PerfECT surveille vos evaluations et messages en arriere-plan");
                monitorChannel.setShowBadge(false);
                nm.createNotificationChannel(monitorChannel);
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error creating notification channels", t);
        }
    }

    private String safeString(DocumentSnapshot doc, String... fields) {
        if (doc == null || fields == null) return null;
        for (String field : fields) {
            if (field == null || field.trim().isEmpty()) continue;
            try {
                if (doc.contains(field)) {
                    Object obj = doc.get(field);
                    if (obj != null) {
                        String s = String.valueOf(obj).trim();
                        if (!s.isEmpty() && !"null".equalsIgnoreCase(s)) {
                            return s;
                        }
                    }
                }
            } catch (Throwable ignored) {}
        }
        return null;
    }
}