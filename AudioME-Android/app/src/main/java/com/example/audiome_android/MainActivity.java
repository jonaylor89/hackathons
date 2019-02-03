package com.example.audiome_android;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

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
    TextView text;

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
                .baseUrl("https://api.github.com/")
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        APIService service = retrofit.create(APIService.class);
        Call<List<AudioMeItems>> listCall = service.listRepos("dragonfury24");
        listCall.enqueue(new Callback<List<AudioMeItems>>() {
            @Override
            public void onResponse(Call<List<AudioMeItems>> call, Response<List<AudioMeItems>> response) {
                //Response<List<AudioMeItems>> listResponse = listCall.execute();
                List<AudioMeItems> items = response.body();
                Toast.makeText(getApplicationContext(), "System worked", Toast.LENGTH_LONG).show();
            }

            @Override
            public void onFailure(Call<List<AudioMeItems>> call, Throwable t) {
                Toast.makeText(getApplicationContext(), "System didn't work", Toast.LENGTH_LONG).show();
                //System.out.print("System didn't work.");
            }
        });
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

