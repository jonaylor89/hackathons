
from distutils.core import setup
from distutils.extension import Extension
from Cython.Build import cythonize

sourcefiles = ['Kinect2Py.pyx', 'kinect_start.c']
extensions = [Extension("Kinect2Py", sourcefiles)]

setup(
    ext_modules = cythonize(extensions)
)
