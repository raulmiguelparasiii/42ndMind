"""Boundary diagnostic: acquired causal reach through real descriptor transfer.
No cognitive agent, reward, semantic interpretation or training claim.
Unix socket ancillary data is an authored substrate, not a general grounding law.
"""
import array, os, socket, tempfile

def run():
    a,b=socket.socketpair()
    with tempfile.TemporaryFile() as resource:
        resource.write(b'previously inaccessible material'); resource.flush()
        b.send(b'x'); plain, ancillary, *_=a.recvmsg(1, socket.CMSG_SPACE(4))
        assert not ancillary
        b.sendmsg([b'x'],[(socket.SOL_SOCKET,socket.SCM_RIGHTS,array.array('i',[resource.fileno()]))])
        payload, ancillary, *_=a.recvmsg(1,socket.CMSG_SPACE(4))
        assert payload==plain
        fds=array.array('i'); fds.frombytes(ancillary[0][2][:fds.itemsize]); fd=fds[0]
        try:
            original=os.pread(fd,100,0)
            os.pwrite(fd,b'changed',0)
            resource.seek(0); changed=resource.read()
            assert changed.startswith(b'changed')
            print('equal ordinary payload:',payload==plain)
            print('acquired read:',original)
            print('shared resource after action:',changed)
        finally: os.close(fd)
    a.close(); b.close()
if __name__=='__main__':run()
