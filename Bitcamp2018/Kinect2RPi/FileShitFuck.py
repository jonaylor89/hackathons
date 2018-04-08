
def get_head():
    values = [0, 0, 0]
    with open(head.dat, 'r') as f:
        line = f.readline()
        if line != '':
            values = line.split(',')

    return values


if __name__ == '__main__':
    from time import sleep
    while True:
        print(get_head())
        sleep(0.1)
