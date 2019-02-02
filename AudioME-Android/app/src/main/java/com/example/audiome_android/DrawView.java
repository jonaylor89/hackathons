package com.example.audiome_android;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.view.MotionEvent;
import android.view.View;

public class DrawView extends View {
    public DrawView(Context context) {
        super(context);
    }

    private Paint paint = new Paint();

    @Override
    protected void onDraw(Canvas canvas){
        super.onDraw(canvas);
        paint.setColor(Color.RED);
        paint.setTextSize(100);
        canvas.drawText("Hello world", (float)(getWidth() / 2), (float)(getHeight() / 2), paint);
    }

    public boolean onTouchEvent(MotionEvent mEvent) {


        return super.onTouchEvent(mEvent);
    }
}
