package com.perfect.tech;

import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.webkit.WebViewAssetLoader;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "PerfECT_WebView";
    private static final int FILECHOOSER_RESULTCODE = 1001;
    private static final int NOTIFICATION_PERMISSION_CODE = 1002;
    public static final String NOTIFICATION_CHANNEL_ID = "perfect_workflow_channel";
    
    private WebView webView;
    private ValueCallback<Uri[]> mUploadCallback;
    private String mPendingNotificationPayload = null;

    @SuppressLint({"SetJavaScriptEnabled", "ObsoleteSdkInt"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Check for notification payload when launched from notification tap
        if (getIntent() != null && getIntent().hasExtra("NOTIFICATION_PAYLOAD")) {
            mPendingNotificationPayload = getIntent().getStringExtra("NOTIFICATION_PAYLOAD");
            Log.d(TAG, "onCreate received NOTIFICATION_PAYLOAD: " + mPendingNotificationPayload);
        }

        // Enable WebView remote debugging (visible in chrome://inspect)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        createNotificationChannel();

        // Request POST_NOTIFICATIONS permission on Android 13+ (Tiramisu)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_CODE);
            }
        }

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain("localhost")
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);

        // Allow mixed content (https page loading http resources)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Force WebView to ALWAYS load fresh assets from APK (disable cache)
        webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);

        // WebChromeClient: console logs + file chooser handler for HTML input type="file"
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "[JS " + consoleMessage.messageLevel() + "] "
                        + consoleMessage.message()
                        + " (line " + consoleMessage.lineNumber()
                        + " of " + consoleMessage.sourceId() + ")");
                return true;
            }

            // Android 5.0+ (Lollipop) File Chooser
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                             FileChooserParams fileChooserParams) {
                if (mUploadCallback != null) {
                    mUploadCallback.onReceiveValue(null);
                    mUploadCallback = null;
                }
                mUploadCallback = filePathCallback;

                Intent intent = null;
                try {
                    intent = fileChooserParams.createIntent();
                } catch (Exception e) {
                    Log.w(TAG, "fileChooserParams.createIntent failed, using fallback", e);
                }

                if (intent == null) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }

                try {
                    startActivityForResult(Intent.createChooser(intent, "Sélectionner un fichier"), FILECHOOSER_RESULTCODE);
                    return true;
                } catch (Exception e) {
                    Log.e(TAG, "Cannot start file chooser activity", e);
                    if (mUploadCallback != null) {
                        mUploadCallback.onReceiveValue(null);
                        mUploadCallback = null;
                    }
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleExternalUri(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleExternalUri(Uri.parse(url));
            }

            private boolean handleExternalUri(Uri uri) {
                if (uri == null) return false;
                String host = uri.getHost();
                if (host != null && (host.equals("localhost") || host.endsWith(".localhost"))) {
                    return false; // Load inside app assets
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    Log.e(TAG, "Cannot open external intent for: " + uri, e);
                    return false;
                }
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = assetLoader.shouldInterceptRequest(request.getUrl());
                if (response != null) {
                    Log.d(TAG, "Asset served: " + request.getUrl());
                }
                return response;
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Log.e(TAG, "WebView error: " + error.getDescription()
                            + " url=" + request.getUrl());
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d(TAG, "Page finished loading: " + url);
                if (mPendingNotificationPayload != null) {
                    final String payload = mPendingNotificationPayload;
                    view.postDelayed(() -> dispatchNotificationToWebView(payload), 1000);
                }
            }
        });

        // Add JavaScript Bridge for Native Notifications
        webView.addJavascriptInterface(new WebAppInterface(), "AndroidNative");

        webView.loadUrl("https://localhost/assets/index.html");

        // Retrieve FCM token and inject it into JS once WebView is ready
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) {
                Log.w(TAG, "FCM getToken failed: " + task.getException());
                return;
            }
            String fcmToken = task.getResult();
            Log.d(TAG, "FCM token: " + fcmToken);
            // Persist locally so PerfECTFirebaseMessagingService can also access it
            getSharedPreferences("PerfECT_Prefs", MODE_PRIVATE)
                    .edit()
                    .putString("fcm_token", fcmToken)
                    .apply();
            // Inject token into JS after a short delay to ensure page has loaded
            webView.postDelayed(() -> {
                String js = "if(typeof window.onFcmTokenReady === 'function') { window.onFcmTokenReady('" + fcmToken + "'); }";
                webView.evaluateJavascript(js, null);
            }, 3000);
        });
    }

    public class WebAppInterface {
        @JavascriptInterface
        public void showNotification(String title, String message, String payload) {
            runOnUiThread(() -> displaySystemNotification(title, message, payload));
        }

        @JavascriptInterface
        public boolean hasNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                return checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                runOnUiThread(() -> {
                    if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_CODE);
                    }
                });
            }
        }

        // Bug 3 fix: clears all PerfECT notifications and resets the app badge
        @JavascriptInterface
        public void clearAllNotifications() {
            runOnUiThread(() -> {
                NotificationManagerCompat.from(MainActivity.this).cancelAll();
                Log.d(TAG, "All notifications cleared by JS request");
            });
        }

        // Starts native background Firestore listener for real-time workflow & message notifications
        @JavascriptInterface
        public void startWorkflowMonitoring(String email) {
            startWorkflowMonitoring(email, "", "");
        }

        @JavascriptInterface
        public void startWorkflowMonitoring(String email, String role, String displayName) {
            if (email == null || email.trim().isEmpty()) return;
            runOnUiThread(() -> {
                try {
                    Intent serviceIntent = new Intent(MainActivity.this, PerfECTWorkflowService.class);
                    serviceIntent.setAction(PerfECTWorkflowService.ACTION_START);
                    serviceIntent.putExtra(PerfECTWorkflowService.EXTRA_EMAIL, email.trim().toLowerCase());
                    if (role != null) serviceIntent.putExtra("USER_ROLE", role.trim());
                    if (displayName != null) serviceIntent.putExtra("USER_NAME", displayName.trim());
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent);
                    } else {
                        startService(serviceIntent);
                    }
                    Log.d(TAG, "Started PerfECTWorkflowService for: " + email + " role=" + role + " name=" + displayName);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start PerfECTWorkflowService", e);
                }
            });
        }

        @JavascriptInterface
        public void stopWorkflowMonitoring() {
            runOnUiThread(() -> {
                try {
                    Intent serviceIntent = new Intent(MainActivity.this, PerfECTWorkflowService.class);
                    serviceIntent.setAction(PerfECTWorkflowService.ACTION_STOP);
                    startService(serviceIntent);
                    Log.d(TAG, "Stopped PerfECTWorkflowService");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to stop PerfECTWorkflowService", e);
                }
            });
        }

        @JavascriptInterface
        public String getPendingNotificationPayload() {
            String p = mPendingNotificationPayload;
            mPendingNotificationPayload = null;
            return p != null ? p : "";
        }
    }

    // Handles notification clicks when app is already in foreground or background (singleTop)
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.hasExtra("NOTIFICATION_PAYLOAD")) {
            String payload = intent.getStringExtra("NOTIFICATION_PAYLOAD");
            Log.d(TAG, "onNewIntent received NOTIFICATION_PAYLOAD: " + payload);
            mPendingNotificationPayload = payload;
            dispatchNotificationToWebView(payload);
        }
    }

    // Dispatches notification tap event to JavaScript so PerfECT reloads Firestore evals and highlights the card
    public void dispatchNotificationToWebView(String payload) {
        if (payload == null || payload.isEmpty() || webView == null) return;
        runOnUiThread(() -> {
            try {
                String escaped = payload.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
                String js = "if (typeof window.onNotificationClicked === 'function') { window.onNotificationClicked('" + escaped + "'); }";
                webView.evaluateJavascript(js, null);
                Log.d(TAG, "Dispatched notification click to WebView: " + js);
            } catch (Exception e) {
                Log.e(TAG, "Error dispatching notification to JS", e);
            }
        });
    }

    // Bug 3 fix: also clear badge when app is brought to foreground (e.g. user taps app icon)
    @Override
    protected void onResume() {
        super.onResume();
        NotificationManagerCompat.from(this).cancelAll();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "Suivi des demandes PerfECT",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications de progression de vos évaluations");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    public void displaySystemNotification(String title, String message, String payload) {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (payload != null) {
                intent.putExtra("NOTIFICATION_PAYLOAD", payload);
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    (int) (System.currentTimeMillis() & 0xfffffff),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                notificationManager.notify((int) (System.currentTimeMillis() & 0xfffffff), builder.build());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error displaying system notification", e);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (mUploadCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                ClipData clipData = data.getClipData();
                if (clipData != null) {
                    results = new Uri[clipData.getItemCount()];
                    for (int i = 0; i < clipData.getItemCount(); i++) {
                        ClipData.Item item = clipData.getItemAt(i);
                        results[i] = item.getUri();
                    }
                } else if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            mUploadCallback.onReceiveValue(results);
            mUploadCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

