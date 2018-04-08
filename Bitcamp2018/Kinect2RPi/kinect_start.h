
#ifndef KINECT_START_H
#define KINECT_START_H

typedef struct joint_{
  int x;
  int z;
  int pixelx;
} joint;

int get_joint (int j);

joint getHead();
#endif
