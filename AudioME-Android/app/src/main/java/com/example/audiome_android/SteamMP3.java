package com.example.audiome_android;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;

import java.io.IOException;

public class SteamMP3 extends Activity {

    private MediaPlayer mediaPlayer;
    private DrawView drawView;

    public SteamMP3(DrawView dv) {
        this.drawView = dv;
        mediaPlayer = new MediaPlayer();
    }

    public void onCreate (Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(drawView);

    }

    public void play() {
        /*
        String url = "https://sample-videos.com/audio/mp3/crowd-cheering.mp3";
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setDescription("mp3");
        request.setTitle("file");
        request.allowScanningByMediaScanner();
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "crowd-cheering.mp3");

        DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        manager.enqueue(request);
*/
       /*
        try {

            mediaPlayer.setDataSource(Environment.DIRECTORY_DOWNLOADS + "/crowd-cheering.mp3");
            mediaPlayer.prepare();
            mediaPlayer.start();


        } catch (IOException io) {
            io.printStackTrace();
        }
        */

        mediaPlayer = MediaPlayer.create(this, Uri.parse("https://sample-videos.com/audio/mp3/crowd-cheering.mp3"));
        mediaPlayer.start();
    }
}
