package com.example.audiome_android;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Callback;
import retrofit2.http.GET;
import retrofit2.http.QueryMap;
import retrofit2.Retrofit;

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
        Retrofit rf = RetrofitClient.getClient("http://api.github.com");

        RestAdapter rest = new RestAdapter.Builder().setEndpoint(BASEPATH).build();
        API service = rest.create(API.class);

        Map<String, String> params = new HashMap<String, String>();
        params.put("key1", "val1");
        params.put("key2", "val2");
        // ... as much as you need.

        service.getMyThing(params, new Callback<String>() {
            // ... do some stuff here.
        });
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


    private interface API {
        @GET("/thing")
        void getMyThing(@QueryMap Map<String, String> params, new Callback<String> callback);
    }
}

