
def get_head():
    values = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]
    with open('Kinect2RPi/head.dat', 'r') as f:
        line = f.readline()
        if line != '':
            values = line.split(',')

    return values

def run():
    while True:
        yield get_head()


if __name__ == '__main__':
    while True:
        print(get_head())
