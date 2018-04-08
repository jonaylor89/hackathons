#include <kinect_interface.h>
#include <gfreenect.h>
#include <skeltrack.h>
#include <math.h>
#include <string.h>
#include <glib-object.h>

static SkeltrackSkeleton *skeleton = NULL;
static GFreenectDevice *kinect = NULL;
static SkeltrackJointList list = NULL;

static gboolean ENABLE_SMOOTHING = TRUE;
static gfloat SMOOTHING_FACTOR = .0;

static guint THRESHOLD_BEGIN = 500;
static guint THRESHOLD_END = 1500;


