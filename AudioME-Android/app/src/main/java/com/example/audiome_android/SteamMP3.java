package com.example.audiome_android;

import android.app.Activity;
import android.media.MediaPlayer;
import android.os.Bundle;

public class SteamMP3 extends Activity {

    private MediaPlayer mediaPlayer = new MediaPlayer();

    public void onCreate (Bundle savedInstanceState, DrawView drawView) {
        super.onCreate(savedInstanceState);
        setContentView(drawView);
    }
}
