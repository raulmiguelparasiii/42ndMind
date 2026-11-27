"""Finite diagnostic of scope expansion versus preservation; not an agent."""
from itertools import product

def relation(domains, constraints):
    keys=tuple(domains)
    return {tuple(zip(keys,v)) for v in product(*(domains[k] for k in keys)) if all(c(dict(zip(keys,v))) for c in constraints)}

def project(rows, keys):
    return {tuple((k,v) for k,v in row if k in keys) for row in rows}

def run():
    d={'a':(0,1),'b':(0,1)}
    old=relation(d,[lambda r:r['a']==r['b']])
    d['c']=(0,1)
    expanded=relation(d,[lambda r:r['a']==r['b'],lambda r:r['b']==r['c']])
    corrected=relation(d,[lambda r:r['a']==r['b'],lambda r:r['b']==r['c'],lambda r:r['c']==1])
    assert project(expanded,{'a','b'})==old
    assert project(corrected,{'a','b'}) < old
    # Individual marginal possibilities do not preserve joint constraints.
    wrong=relation({'a':(0,1),'b':(0,1)},[lambda r:r['a']!=r['b']])
    assert all(project(wrong,{k})==project(old,{k}) for k in ('a','b'))
    assert wrong.isdisjoint(old)
    print('conservative extension:', sorted(expanded))
    print('material correction:',sorted(corrected))
    print('same marginals, disjoint joint relations:', sorted(old),sorted(wrong))
if __name__=='__main__':run()
