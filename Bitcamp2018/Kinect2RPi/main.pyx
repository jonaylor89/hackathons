
cdef extern from 'kinect_start.h':
	int C_start "start" ()

cpdef start():
	start()	

cpdef get_joints():
	 
