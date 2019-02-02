package com.example.audiome_android;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;

public class MainActivity extends AppCompatActivity implements View.OnClickListener {
    private DrawView drawView;
    private MP3Player mp3Player;

    private Button b1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        drawView = new DrawView(this);
        setContentView(drawView);

        b1 = findViewById(R.id.buttonOne);
        b1.setOnClickListener(this);
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

    @Override
    public void onClick(View v) {
        if (v.getId() == R.id.buttonOne) {
            //do something
        }
    }
}

