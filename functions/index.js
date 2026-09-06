// Firebase Cloud Functions — PerfECT Workflow Push Notifications
// Project: perfect-net
//
// Trigger: When a Firestore evaluation document is updated AND workflowStep increases,
// this function looks up the author's FCM token(s) and sends a push notification
// to their Android device(s) — even when the app is in background or device is asleep.
//
// Deploy: firebase deploy --only functions
// Requires: Firebase Blaze plan (or free tier with <= 2M invocations/month)

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// Workflow step labels (mirrors main.js)
const WORKFLOW_STEPS_LABELS = {
  1: "Demande recue et enregistree",
  2: "Examen et verification en cours",
  3: "Plan d'action et mesures correctives engagees",
  4: "Mise en oeuvre des resolutions sur le terrain",
  5: "Demande traitee et cloturee avec succes"
};

/**
 * Triggered on any update to an evaluation document.
 * Sends an FCM push if workflowStep has increased.
 */
exports.onWorkflowStepUpdated = onDocumentUpdated(
  "evaluations/{evalId}",
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();
    const evalId = event.params.evalId;

    const prevStep    = parseInt(before.workflowStep || 0);
    const currentStep = parseInt(after.workflowStep  || 0);

    // Only proceed if the step actually increased
    if (currentStep <= prevStep || currentStep <= 0) {
      return null;
    }

    // Determine the free user (author) who submitted this evaluation
    const authorEmail = (after.authorEmail || after.email || "").toLowerCase().trim();
    if (!authorEmail) {
      console.warn(`[FCM] No authorEmail on evaluation ${evalId}, skipping.`);
      return null;
    }

    const entityName = after.targetEntity || after.actorName || "l'etablissement";
    const stepDesc   = WORKFLOW_STEPS_LABELS[currentStep] || `Etape ${currentStep}/5`;

    const title   = `Mise a jour de votre evaluation`;
    const bodyMsg = `${entityName} a fait avancer votre demande a l'etape ${currentStep}/5 : ${stepDesc}`;

    console.log(`[FCM] Workflow step ${prevStep} -> ${currentStep} for eval ${evalId}, notifying ${authorEmail}`);

    // Look up FCM tokens for the author in the fcmTokens collection
    const db = getFirestore();
    const tokenDocRef = db.collection("fcmTokens").doc(authorEmail);
    const tokenDoc = await tokenDocRef.get();

    if (!tokenDoc.exists) {
      console.warn(`[FCM] No FCM tokens found for ${authorEmail}`);
      return null;
    }

    const tokensMap = tokenDoc.data().tokens || {};
    const tokens = Object.keys(tokensMap);

    if (tokens.length === 0) {
      console.warn(`[FCM] Empty tokens map for ${authorEmail}`);
      return null;
    }

    // Send FCM message to each registered device token
    const messaging = getMessaging();
    const sendResults = await Promise.allSettled(
      tokens.map(token =>
        messaging.send({
          token,
          notification: {
            title,
            body: bodyMsg
          },
          data: {
            evalId,
            step: String(currentStep),
            title,
            body: bodyMsg,
            payload: JSON.stringify({ evalId, step: currentStep })
          },
          android: {
            priority: "high",
            notification: {
              channelId: "perfect_workflow_channel",
              icon: "ic_launcher",
              sound: "default"
            }
          }
        }).catch(err => {
          // Clean up stale/invalid tokens from Firestore
          if (err.code === "messaging/registration-token-not-registered" ||
              err.code === "messaging/invalid-registration-token") {
            console.log(`[FCM] Removing stale token for ${authorEmail}`);
            const update = {};
            update[`tokens.${token}`] = require("firebase-admin/firestore").FieldValue.delete();
            tokenDocRef.update(update).catch(() => {});
          }
          throw err;
        })
      )
    );

    const succeeded = sendResults.filter(r => r.status === "fulfilled").length;
    const failed    = sendResults.filter(r => r.status === "rejected").length;
    console.log(`[FCM] Sent ${succeeded}/${tokens.length} notifications (${failed} failed) to ${authorEmail}`);
    return null;
  }
);
