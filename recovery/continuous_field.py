"""Research-only continuous sensorimotor field. No assigned task/reward.
Inspired by IDSM (Egbert and Barandiaran 2014), not a reproduction.
The simulated body/environment is coupled to the field; no external target is
available to it. Numerical integration realizes a continuous equation.
"""
import numpy as np
from scipy.integrate import solve_ivp
import json

grid=np.linspace(-1,1,9)
centers=np.array([(s,a) for s in grid for a in grid]); n=len(centers)

def run(seed=0, adaptive=True, corrected=False):
    rng=np.random.default_rng(seed)
    initial=np.r_[rng.normal(0,.03,2),.12,.05,np.zeros(3*n)]
    def field(t,z,polarity):
        x,v,a,b=z[:4]; w,f,g=z[4:].reshape(3,n)
        q=np.array([np.tanh(x),np.tanh(a)])
        k=np.exp(-np.sum((centers-q)**2,axis=1)/.075)
        dv=polarity*1.3*np.tanh(a)-.55*v-.35*x-.08*x**3
        ds=(1-np.tanh(x)**2)*v
        if corrected:
            mismatch=np.abs(g-w*ds)/(w+.05)
            k_eff=k*np.exp(-mismatch/.20)
        else:k_eff=k
        historical=(k_eff@f)/(.4+k_eff@w) if adaptive else 0.
        da=(.5-a*a-b*b)*a-b+1.25*historical
        db=(.5-a*a-b*b)*b+a
        dw=k-.25*w; df=k*da-.25*f; dg=k*ds-.25*g
        return np.r_[v,dv,da,db,dw,df,dg]
    ts=[]; ys=[]; z=initial
    for start,end,p in [(0,40,1),(40,80,-1),(80,120,1)]:
        sol=solve_ivp(lambda t,z:field(t,z,p),(start,end),z,rtol=2e-6,atol=1e-8,max_step=.08,dense_output=True)
        tt=np.linspace(start,end,801); yy=sol.sol(tt)
        ts.extend(tt); ys.extend(yy.T); z=sol.y[:,-1]
    t=np.asarray(ts); y=np.asarray(ys); out=[]
    for j in range(3):
        zz=y[801*j:801*(j+1)]; last=zz[-200:]; w,f,g=zz[-1,4:].reshape(3,n)
        out.append({'phase':j,'coupling':(-1 if j==1 else 1), 'mean_abs_actuation':float(np.mean(np.abs(np.tanh(last[:,2])))), 'mean_abs_motion':float(np.mean(np.abs(last[:,1]))),'sense_action_corr':float(np.corrcoef(last[:,0],last[:,2])[0,1]),'field_support':int(np.sum(w>.1)), 'field_magnitude':float(np.linalg.norm(f)), 'relative_environmental_mismatch':float(np.mean(np.abs(g)/(w+.05)))})
    return {'seed':seed,'adaptive':adaptive,'corrected':corrected,'phases':out,'finite':bool(np.isfinite(y).all())}

if __name__=='__main__':
    print(json.dumps([run(s,a,c) for s in range(3) for a,c in [(False,False),(True,False),(True,True)]],indent=2))
