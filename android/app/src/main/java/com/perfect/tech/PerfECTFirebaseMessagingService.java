package com.perfect.tech;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * PerfECT Firebase Cloud Messaging Service.
 * Handles background push notifications and FCM token refresh.
 */
public class PerfECTFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "PerfECT_FCM";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM message received from: " + remoteMessage.getFrom());

        String title = "PerfECT - Mise a jour";
        String body  = "Votre evaluation a ete traitee.";
        String payload = "";

        if (remoteMessage.getNotification() != null) {
            RemoteMessage.Notification notif = remoteMessage.getNotification();
            if (notif.getTitle() != null)  title   = notif.getTitle();
            if (notif.getBody()  != null)  body    = notif.getBody();
        }

        if (remoteMessage.getData() != null && !remoteMessage.getData().isEmpty()) {
            if (remoteMessage.getData().containsKey("title"))   title   = remoteMessage.getData().get("title");
            if (remoteMessage.getData().containsKey("body"))    body    = remoteMessage.getData().get("body");
            if (remoteMessage.getData().containsKey("payload")) payload = remoteMessage.getData().get("payload");
        }

        showPerfECTNotification(title, body, payload);
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed: " + token);
        getSharedPreferences("PerfECT_Prefs", MODE_PRIVATE)
                .edit()
                .putString("fcm_token", token)
                .apply();
    }

    private void showPerfECTNotification(String title, String body, String payload) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (payload != null && !payload.isEmpty()) {
            intent.putExtra("NOTIFICATION_PAYLOAD", payload);
        }

        int requestCode = (int) (System.currentTimeMillis() & 0xfffffff);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                requestCode,
                intent,
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

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                        == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            notificationManager.notify(requestCode, builder.build());
        }
    }
}