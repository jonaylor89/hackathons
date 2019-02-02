package com.example.audiome_android;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;


public class MainActivity extends AppCompatActivity {

    private DrawView drawView;
    private SteamMP3 steamMP3;
    private MP3Player mp3Player;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        drawView = new DrawView(this);
        setContentView(drawView);
    }

    @Override
    protected void onStart() {
        super.onStart();
        mp3Player = new MP3Player("https://sample-videos.com/audio/mp3/crowd-cheering.mp3");
        mp3Player.play();

        Controller controller = new Controller();
        controller.start();
    }

    @Override
    protected void onStop() {
        super.onStop();
    }
}
