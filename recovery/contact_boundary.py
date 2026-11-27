"""Exact finite causal ambiguity diagnostic; no agent or training claim."""
import socket

def exchange(sign, action):
    a,b=socket.socketpair()
    try:
        a.sendall(str(action).encode()); received=int(b.recv(32))
        b.sendall(str(sign*received).encode()); return int(a.recv(32))
    finally:a.close();b.close()

def run():
    worlds=(-1,1); actions=(-1,0,1)
    initial={w:exchange(w,0) for w in worlds}
    assert len(set(initial.values()))==1
    outcomes={a:[exchange(w,a) for w in worlds] for a in actions}
    assert not any(all(y==1 for y in ys) for ys in outcomes.values())
    for a in (-1,1):
        assert len(set(outcomes[a]))==2
    for w in worlds:
        y=exchange(w,1); compatible=[v for v in worlds if v==y]
        assert compatible==[w]
        print('peer',w,'contact',y,'compatible',compatible)
    print('initial',initial,'outcomes',outcomes)
if __name__=='__main__':run()
