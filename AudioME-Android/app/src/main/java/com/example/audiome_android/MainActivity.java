package com.example.audiome_android;

import android.os.Bundle;
<<<<<<< HEAD
import android.support.v7.app.AppCompatActivity;


public class MainActivity extends AppCompatActivity {

    private DrawView drawView;
    private SteamMP3 steamMP3;
    private MP3Player mp3Player;

=======
import android.util.Log;
import android.view.View;
import android.widget.Button;

import com.spotify.android.appremote.api.ConnectionParams;
import com.spotify.android.appremote.api.Connector;
import com.spotify.android.appremote.api.SpotifyAppRemote;

import com.spotify.protocol.client.Subscription;
import com.spotify.protocol.types.PlayerState;
import com.spotify.protocol.types.Track;

import java.io.IOException;

import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;


public class MainActivity extends AppCompatActivity  implements View.OnClickListener {
    private Button b1;
    private static final String CLIENT_ID = "your_client_id";
    private static final String REDIRECT_URI = "http://com.yourdomain.yourapp/callback";
    private SpotifyAppRemote mSpotifyAppRemote;
    private DrawView drawView = new DrawView(this);
>>>>>>> 2af39f295da1f5cea1d7e95fdcd2c8bdc15e33fb

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        drawView = new DrawView(this);
        setContentView(drawView);
<<<<<<< HEAD
=======
        b1 = findViewById(R.id.buttonOne);
        b1.setOnClickListener(this);
        Retrofit.Builder builder= new Retrofit.Builder().baseUrl("https://api.github.com/").addConverterFactory(GsonConverterFactory.create());
        Retrofit retrofit = builder.build();
>>>>>>> 2af39f295da1f5cea1d7e95fdcd2c8bdc15e33fb
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
if (v.getId() == R.id.buttonOne){
    //do something
}
    }
}
