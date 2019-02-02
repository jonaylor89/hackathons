package com.example.audiome_android;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.converter.gson.GsonConverterFactory;
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

        /*
        b1 = findViewById(R.id.buttonOne);
        b1.setOnClickListener(this);
        */
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("https://api.github.com")
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        APIService service = retrofit.create(APIService.class);
        Call<List<AudioMeItems>> listCall = service.listRepos("dragonfury24");
        try {
            Response<List<AudioMeItems>> listResponse = listCall.execute();
            List<AudioMeItems> items = listResponse.body();
            System.out.println(items);
        } catch (IOException io) {
            io.printStackTrace();
        }
        System.out.println(service.listRepos("dragonfury24"));
    }

    @Override
    protected void onStart() {
        super.onStart();
        mp3Player = new MP3Player("https://sample-videos.com/audio/mp3/crowd-cheering.mp3");
        mp3Player.play();


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

