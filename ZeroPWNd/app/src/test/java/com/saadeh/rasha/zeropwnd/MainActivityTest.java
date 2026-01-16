package com.saadeh.rasha.zeropwnd;

import org.junit.Before;
import org.junit.Test;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import static com.saadeh.rasha.zeropwnd.MainActivity.JSON;
import static org.junit.Assert.*;

public class MainActivityTest {

        int resultt;

    @Before
    public void setUp() throws Exception {
        String postUrl= "https://zeropwnd.herokuapp.com/";
        String postBody="https://facebook.com";


        OkHttpClient client = new OkHttpClient();

        RequestBody body = RequestBody.create(JSON, postBody);

        Request request = new Request.Builder()
                .url(postUrl)
                .post(body)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                call.cancel();

            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                resultt = 5;
            }
        });


            System.out.println(resultt);

    }



    @Test
    public void addition_isCorrect() {
        assertEquals(4, 2 + 2);
    }


    @Test
    public void testSuccess(){


        int parsedData = 2;
        int expected = 2;
        assertEquals(expected, parsedData);
    }

    @Test
    public void testFailure(){

        String response = "[exploit1, exploit2]";

        int parsedData = resultt;
        int expected = 1;
        assertEquals(expected, parsedData);
    }
}