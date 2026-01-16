#include <gfreenect.h>
#include <skeltrack.h>
#include <math.h>
#include <string.h>
#include <glib-object.h>
#include "kinect_start.h"
#include <stdio.h>
#include <clutter/clutter.h>

static SkeltrackSkeleton *skeleton = NULL;
static GFreenectDevice *kinect = NULL;
static SkeltrackJointList list = NULL;

static gboolean SHOW_SKELETON = TRUE;
static gboolean ENABLE_SMOOTHING = TRUE;
static gfloat SMOOTHING_FACTOR = .0;

static guint THRESHOLD_BEGIN = 500;
/* Adjust this value to increase of decrease
   the threshold */
static guint THRESHOLD_END   = 1500; 
joint THEhead = {-1,-1,-1,-1};
joint THEright = {-1,-1,-1,-1};
joint THEleft = {-1,-1,-1,-1};
typedef struct
{
	guint16 *reduced_buffer;
	gint width;
	gint height;
	gint reduced_width;
	gint reduced_height;
} BufferInfo;

static void setHead (SkeltrackJoint *head)
{
	THEhead.x=head->x;
	THEhead.y=head->y;
	THEhead.z=head->z;
	THEhead.pixelx=head->screen_x;
}
static void setLeft (SkeltrackJoint *left)
{
	THEleft.x=left->x;
	THEleft.z=left->z;
	THEleft.y=left->y;
	THEleft.pixelx=left->screen_x;
}
static void setRight (SkeltrackJoint *right)
{
	THEright.x=right->x;
	THEright.y=right->y;
	THEright.z=right->z;
	THEright.pixelx=right->screen_x;
}

	static void
on_track_joints (GObject      *obj,
		GAsyncResult *res,
		gpointer      user_data)
{
	guint i;
	BufferInfo *buffer_info;
	guint16 *reduced;
	gint width, height, reduced_width, reduced_height;
	GError *error = NULL;

	buffer_info = (BufferInfo *) user_data;
	reduced = (guint16 *) buffer_info->reduced_buffer;
	width = buffer_info->width;
	height = buffer_info->height;
	reduced_width = buffer_info->reduced_width;
	reduced_height = buffer_info->reduced_height;
	SkeltrackJoint *head, *left, *right;
	list = skeltrack_skeleton_track_joints_finish (skeleton,
			res,
			&error);

	if (error == NULL)
	{
		if (SHOW_SKELETON)
		{
		}
	}
	else
	{
		g_warning ("%s\n", error->message);
		g_error_free (error);
	}

	g_slice_free1 (reduced_width * reduced_height * sizeof (guint16), reduced);

	g_slice_free (BufferInfo, buffer_info);
	if(list != NULL)
	{
		head = skeltrack_joint_list_get_joint(list,SKELTRACK_JOINT_ID_HEAD);
		left = skeltrack_joint_list_get_joint(list,SKELTRACK_JOINT_ID_LEFT_HAND);
		right = skeltrack_joint_list_get_joint(list,SKELTRACK_JOINT_ID_RIGHT_HAND);
		FILE *headdat;
		headdat = fopen("/home/pi/Bitcamp2018/Kinect2RPi/head.dat", "w+");
		if(head != NULL)
		{
			setHead(head);
			setLeft(left);
			setRight(right);
			printf("%i,%i,%i\n",THEhead.x,THEhead.z,THEhead.pixelx);
			fprintf(headdat, "%i,%i,%i,%i,",THEhead.x,THEhead.y,THEhead.z,THEhead.pixelx);
			fprintf(headdat, "%i,%i,%i,%i,",THEleft.x,THEleft.y,THEleft.z,THEleft.pixelx);
			fprintf(headdat, "%i,%i,%i,%i",THEright.x,THEright.y,THEright.z,THEright.pixelx);

		}
		else
		{
			fprintf(headdat, "-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1");
		}
		fclose(headdat);
	}
	skeltrack_joint_list_free (list);
}


joint getHead()
{
	return THEhead;
}

	static void
grayscale_buffer_set_value (guchar *buffer, gint index, guchar value)
{
	buffer[index * 3] = value;
	buffer[index * 3 + 1] = value;
	buffer[index * 3 + 2] = value;
}

	static BufferInfo *
process_buffer (guint16 *buffer,
		guint width,
		guint height,
		guint dimension_factor,
		guint threshold_begin,
		guint threshold_end)
{
	BufferInfo *buffer_info;
	gint i, j, reduced_width, reduced_height;
	guint16 *reduced_buffer;

	g_return_val_if_fail (buffer != NULL, NULL);

	reduced_width = (width - width % dimension_factor) / dimension_factor;
	reduced_height = (height - height % dimension_factor) / dimension_factor;

	reduced_buffer = g_slice_alloc0 (reduced_width * reduced_height *
			sizeof (guint16));

	for (i = 0; i < reduced_width; i++)
	{
		for (j = 0; j < reduced_height; j++)
		{
			gint index;
			guint16 value;

			index = j * width * dimension_factor + i * dimension_factor;
			value = buffer[index];

			if (value < threshold_begin || value > threshold_end)
			{
				reduced_buffer[j * reduced_width + i] = 0;
				continue;
			}

			reduced_buffer[j * reduced_width + i] = value;
		}
	}

	buffer_info = g_slice_new0 (BufferInfo);
	buffer_info->reduced_buffer = reduced_buffer;
	buffer_info->reduced_width = reduced_width;
	buffer_info->reduced_height = reduced_height;
	buffer_info->width = width;
	buffer_info->height = height;

	return buffer_info;
}

	static guchar *
create_grayscale_buffer (BufferInfo *buffer_info, gint dimension_reduction)
{
	gint i,j;
	gint size;
	guchar *grayscale_buffer;
	guint16 *reduced_buffer;

	reduced_buffer = buffer_info->reduced_buffer;

	size = buffer_info->width * buffer_info->height * sizeof (guchar) * 3;
	grayscale_buffer = g_slice_alloc (size);
	/*Paint is white*/
	memset (grayscale_buffer, 255, size);

	for (i = 0; i < buffer_info->reduced_width; i++)
	{
		for (j = 0; j < buffer_info->reduced_height; j++)
		{
			if (reduced_buffer[j * buffer_info->reduced_width + i] != 0)
			{
				gint index = j * dimension_reduction * buffer_info->width +
					i * dimension_reduction;
				grayscale_buffer_set_value (grayscale_buffer, index, 0);
			}
		}
	}

	return grayscale_buffer;
}

	static void
on_depth_frame (GFreenectDevice *kinect, gpointer user_data)
{
	gboolean smoothing_enabled;
	gint width, height;
	gint dimension_factor;
	guchar *grayscale_buffer;
	guint16 *depth;
	BufferInfo *buffer_info;
	gsize len;
	GError *error = NULL;
	GFreenectFrameMode frame_mode;

	depth = (guint16 *) gfreenect_device_get_depth_frame_raw (kinect,
			&len,
			&frame_mode);

	width = frame_mode.width;
	height = frame_mode.height;

	g_object_get (skeleton, "dimension-reduction", &dimension_factor, NULL);

	buffer_info = process_buffer (depth,
			width,
			height,
			dimension_factor,
			THRESHOLD_BEGIN,
			THRESHOLD_END);

	skeltrack_skeleton_track_joints (skeleton,
			buffer_info->reduced_buffer,
			buffer_info->reduced_width,
			buffer_info->reduced_height,
			NULL,
			on_track_joints,
			buffer_info);


}

	static void
on_video_frame (GFreenectDevice *kinect, gpointer user_data)
{
	guchar *buffer;
	GError *error = NULL;
	GFreenectFrameMode frame_mode;

	buffer = gfreenect_device_get_video_frame_rgb (kinect, NULL, &frame_mode);

}

	static gboolean
on_skeleton_draw (gint width,
		gint height,
		gpointer user_data)
{
	SkeltrackJoint *head, *left_hand, *right_hand,
		       *left_shoulder, *right_shoulder, *left_elbow, *right_elbow;

	if (list == NULL)
		return FALSE;

	head = skeltrack_joint_list_get_joint (list,
			SKELTRACK_JOINT_ID_HEAD);
	left_hand = skeltrack_joint_list_get_joint (list,
			SKELTRACK_JOINT_ID_LEFT_HAND);
	right_hand = skeltrack_joint_list_get_joint (list,
			SKELTRACK_JOINT_ID_RIGHT_HAND);
	left_shoulder = skeltrack_joint_list_get_joint (list,
			SKELTRACK_JOINT_ID_LEFT_SHOULDER);
	right_shoulder = skeltrack_joint_list_get_joint (list,
			SKELTRACK_JOINT_ID_RIGHT_SHOULDER);
	left_elbow = skeltrack_joint_list_get_joint (list,
			SKELTRACK_JOINT_ID_LEFT_ELBOW);
	right_elbow = skeltrack_joint_list_get_joint (list,
			SKELTRACK_JOINT_ID_RIGHT_ELBOW);

	/* Paint it white */
	skeltrack_joint_list_free (list);
	list = NULL;

	return FALSE;
}

	static void
set_threshold (gint difference)
{
	gint new_threshold = THRESHOLD_END + difference;
	if (new_threshold >= THRESHOLD_BEGIN + 300 &&
			new_threshold <= 4000)
		THRESHOLD_END = new_threshold;
}

	static void
set_tilt_angle (GFreenectDevice *kinect, gdouble difference)
{
	GError *error = NULL;
	gdouble angle;
	angle = gfreenect_device_get_tilt_angle_sync (kinect, NULL, &error);
	if (error != NULL)
	{
		g_error_free (error);
		return;
	}

	if (angle >= -31 && angle <= 31)
		gfreenect_device_set_tilt_angle (kinect,
				angle + difference,
				NULL,
				NULL,
				NULL);
}

	static void
enable_smoothing (gboolean enable)
{
	if (skeleton != NULL)
		g_object_set (skeleton, "enable-smoothing", enable, NULL);
}

	static void
set_smoothing_factor (gfloat factor)
{
	if (skeleton != NULL)
	{
		SMOOTHING_FACTOR += factor;
		SMOOTHING_FACTOR = CLAMP (SMOOTHING_FACTOR, 0.0, 1.0);
		g_object_set (skeleton, "smoothing-factor", SMOOTHING_FACTOR, NULL);
	}
}

	static void
on_new_kinect_device (GObject      *obj,
		GAsyncResult *res,
		gpointer      user_data)
{
	printf("Getting a kinect\n");
	GError *error = NULL;
	gint width = 640;
	gint height = 480;

	kinect = gfreenect_device_new_finish (res, &error);
	if (kinect == NULL)
	{
		g_debug ("Failed to created kinect device: %s", error->message);
		g_error_free (error);
		return;
	}

	g_debug ("Kinect device created!");

	skeleton = skeltrack_skeleton_new ();
	g_object_get (skeleton, "smoothing-factor", &SMOOTHING_FACTOR, NULL);

	g_signal_connect (kinect,
			"depth-frame",
			G_CALLBACK (on_depth_frame),
			NULL);

	g_signal_connect (kinect,
			"video-frame",
			G_CALLBACK (on_video_frame),
			NULL);
	gfreenect_device_set_tilt_angle (kinect, 0, NULL, NULL, NULL);

	gfreenect_device_start_depth_stream (kinect,
			GFREENECT_DEPTH_FORMAT_MM,
			NULL);

	gfreenect_device_start_video_stream (kinect,
			GFREENECT_RESOLUTION_MEDIUM,
			GFREENECT_VIDEO_FORMAT_RGB, NULL);

}

	static void
quit (gint signale)
{
	signal (SIGINT, 0);

}

	int
main (int argc, char *argv[])
{
	if (clutter_init (&argc, &argv) != CLUTTER_INIT_SUCCESS)
		return -1;
	gfreenect_device_new (0,
			GFREENECT_SUBDEVICE_CAMERA,
			NULL,
			on_new_kinect_device,
			NULL);
	printf("We got through the kinect\n");
	signal (SIGINT, quit);
	clutter_main();
	if (kinect != NULL)
		g_object_unref (kinect);

	if (skeleton != NULL)
	{
		g_object_unref (skeleton);
	}

	return 0;
}

