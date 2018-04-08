
cdef extern from 'kinect_start.h':
	int get_joint()
        cdef struct EasyJoint:
            cdef int x
            cdef int y
            cdef int z
            cdef int screenX
            cdef int screenY

        ctypedef SKELEasyJoint EasyJoint

cdef tuple struct_to_tuple(SkeltrackJoint sj):
    tuple values = (0, 0, 0)
    
    if (sj != NULL):
        values[0] = sj.x
        values[1] = sj.y
        values[2] = sj.z

    return values

def joint_tuple():
    tuple joints = (0, 0, 0, 0, 0, 0, 0)
    for x in range(7):
        joints[x] = struct_to_tuple(get_joint(x))
         
        

         
        

        

	 
