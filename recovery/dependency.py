"""Diagnostic: intrinsic materiality as causal dependence, not a reward.
A continuous chemical network creates a new dependency through its own
production. Compare an observationally identical externally fed network.
No cognition claim. Rates and reaction topology are authored.
"""
import numpy as np
from scipy.integrate import solve_ivp

def field(t,z,feed=False,cut=False):
    a,b,c,e=z
    v1=a*e/(1+e); v2=b*e/(1+e); v3=a*c/(1+c)
    if cut: v2=0
    return np.array([2*v3-.3*a, v1-.5*b, (0 if feed else v2)-.5*c, 1-.4*e-.1*(v1+v2)])

def run():
    z=np.array([.3,0.,.4,1.])
    sol=solve_ivp(field,(0,12),z,dense_output=True,rtol=1e-9,atol=1e-11)
    def replay(t,z,cut=False):
        out=field(t,z,feed=True,cut=cut)
        a,b,c,e=sol.sol(t)
        out[2]+=b*e/(1+e)
        return out
    clone=solve_ivp(replay,(0,12),z,dense_output=True,rtol=1e-9,atol=1e-11)
    ts=np.linspace(0,12,100)
    print('observational maximum difference',np.max(abs(sol.sol(ts)-clone.sol(ts))))
    for t in [0,2,6]:
        a,b,c,e=sol.sol(t)
        print('contact',t,'state',sol.sol(t).round(5),'lost c production on cut',round(b*e/(1+e),5),'a sensitivity to c',round(2*a/(1+c)**2,5))
    for name,f in [('coupled',lambda t,z:field(t,z,cut=True)),('replay',lambda t,z:replay(t,z,cut=True))]:
        r=solve_ivp(f,(6,12),sol.sol(6),rtol=1e-9,atol=1e-11)
        print(name,'after intervention',r.y[:,-1].round(5))
if __name__=='__main__':run()
