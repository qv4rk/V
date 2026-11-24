package com.feisttech.apktest;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;
public class MainActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(48,48,48,48);
        root.setBackgroundColor(Color.rgb(250,248,242));
        TextView title = new TextView(this);
        title.setText("FeistTech");
        title.setTextSize(34);
        title.setGravity(Gravity.CENTER);
        title.setTextColor(Color.rgb(30,30,30));
        TextView message = new TextView(this);
        message.setText("\nReading Room APK pipeline works.\n\nBuilt directly on this phone.");
        message.setTextSize(20);
        message.setGravity(Gravity.CENTER);
        message.setTextColor(Color.rgb(60,60,60));
        root.addView(title);
        root.addView(message);
        setContentView(root);
    }
}
