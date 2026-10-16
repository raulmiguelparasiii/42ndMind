'use strict';

// Universal-Language representation of the Philosopher's Stone canonical
// formal semantic kernel.
//
// The source builder uses readable names only as scaffolding. The compiled
// `pure` object contains the already-anonymized Stone relational structures
// plus a canonical mathematical graph with no Stone semantic labels. It does
// not invent a psychometric coordinate estimator: Delta remains a constrained
// signed relation because the Stone source fixes its semantics/range but does
// not supply one universal numerical measurement rule for arbitrary evidence.

const { anonymousBasis } = require('./stone-closed-math');
const { MOP, variable:V, constant:C, app:A, compileMathGraph } = require('./universal-math-graph');

const op=(k,...xs)=>A(MOP[k],...xs);
const abs=x=>op('ABS',x);
const add=(...xs)=>op('ADD',...xs);
const sq=x=>op('SQUARE',x);
const eq=(a,b)=>op('EQ',a,b);
const lt=(a,b)=>op('LT',a,b);
const le=(a,b)=>op('LE',a,b);
const iff=(a,b)=>op('IFF',a,b);
const and=(...xs)=>op('AND',...xs);
const neg=x=>op('NEG',x);
const tuple=(...xs)=>op('TUPLE',...xs);
const apply=(...xs)=>op('APPLY',...xs);
const delta=(...xs)=>op('DELTA',...xs);
const implies=(a,b)=>op('IMPLIES',a,b);

function buildStoneKernelSource(prefix='s'){
  const n=k=>V(`${prefix}:${k}`);
  const zero=C(0), one=C(1), minusOne=C(-1), two=C(2);

  // Entity/referent/orientation frame and a revised referent for realization.
  const q=n('q'), r=n('r'), rp=n('r2'), F=n('F');
  const phi=n('phi'), phip=n('phi2');
  const x=n('x'), y=n('y'), z=n('z');
  const xp=n('x2'), yp=n('y2'), zp=n('z2');

  // Six anonymous limiting structures are referenced numerically. Their full
  // graph definitions are bundled into the compiled pure object separately.
  const S=[0,1,2,3,4,5].map(C);

  const development=n('d'), experience=n('e');
  const isNull=n('is0'), isDeveloping=n('isI'), isStance=n('isS');
  const lateral=n('lp'), friction=n('fp');
  const maturePoint=n('m'), collapsePoint=n('c');
  const mature=n('isM'), collapse=n('isC');
  const upper=n('up'), equator=n('eq'), lower=n('lo');

  // Evidence-warranted region stays distinct from the actual orientation.
  const omega=n('omega'), exact=n('exact');

  // Contextual emphasis is a separate normalized four-way distribution, not
  // another spelling of structural displacement.
  const alpha=n('alpha');
  const a0=n('a0'),a1=n('a1'),a2=n('a2'),a3=n('a3');
  const decoded=n('decode');

  const constraints=[
    // Phi(q,r) and the octahedral referent.
    eq(phi,apply(F,q,r)),
    eq(phi,tuple(x,y,z)),
    op('IN',phi,r),
    le(add(abs(x),abs(y),abs(z)),one),

    // The three signed functions. The pair indices are anonymous; external
    // semantics are supplied only by the audit legend.
    eq(x,delta(q,r,S[0],S[1])),
    eq(y,delta(q,r,S[4],S[5])),
    eq(z,delta(q,r,S[3],S[2])),
    le(minusOne,x),le(x,one),
    le(minusOne,y),le(y,one),
    le(minusOne,z),le(z,one),
    eq(delta(q,r,S[0],S[1]),neg(delta(q,r,S[1],S[0]))),
    eq(delta(q,r,S[4],S[5]),neg(delta(q,r,S[5],S[4]))),
    eq(delta(q,r,S[3],S[2]),neg(delta(q,r,S[2],S[3]))),

    // Development and experience are two magnitudes of the same orientation.
    eq(development,add(abs(x),abs(y),abs(z))),
    eq(experience,op('SQRT',add(sq(x),sq(y),sq(z)))),
    iff(isNull,eq(development,zero)),
    iff(isDeveloping,and(lt(zero,development),lt(development,one))),
    iff(isStance,eq(development,one)),

    // Realization changes/revises the referent while keeping q and requiring a
    // newly situated Phi(q,r'). No equality between phi and phip is asserted.
    op('TRANSITION',r,rp),
    eq(phip,apply(F,q,rp)),
    eq(phip,tuple(xp,yp,zp)),
    op('IN',phip,rp),
    le(add(abs(xp),abs(yp),abs(zp)),one),

    // Unresolved purpose-meaning load and lateral Euclidean friction.
    eq(lateral,add(abs(x),abs(z))),
    eq(friction,op('SQRT',add(sq(x),sq(z)))),
    eq(sq(experience),add(sq(friction),sq(y))),
    implies(isStance,eq(lateral,add(one,neg(abs(y))))),
    implies(isStance,le(op('DIV',lateral,op('SQRT',two)),friction)),
    implies(isStance,le(friction,lateral)),

    // Distinguished geometric limits and vertical regions.
    eq(maturePoint,tuple(zero,one,zero)),
    eq(collapsePoint,tuple(zero,minusOne,zero)),
    iff(mature,eq(phi,maturePoint)),
    iff(collapse,eq(phi,collapsePoint)),
    iff(upper,lt(zero,y)),
    iff(equator,and(isStance,eq(y,zero))),
    iff(lower,and(isStance,lt(y,zero))),

    // Evaluator uncertainty is represented by a region containing the actual
    // orientation, not by moving Phi itself.
    op('SUBSET',omega,r),
    op('IN',phi,omega),
    iff(exact,eq(op('CARD',omega),one)),

    // Contextual emphasis: four nonnegative contributions summing to one.
    eq(alpha,tuple(a0,a1,a2,a3)),
    le(zero,a0),le(zero,a1),le(zero,a2),le(zero,a3),
    eq(add(a0,a1,a2,a3),one),

    // Surface coordinate decoding recovers nonnegative directional
    // contributions without treating them as independent possessions.
    implies(isStance,eq(decoded,tuple(
      op('MAX',x,zero),op('MAX',neg(x),zero),
      op('MAX',z,zero),op('MAX',neg(z),zero),
      op('MAX',y,zero),op('MAX',neg(y),zero)
    )))
  ];

  return {constraints};
}

function compileStoneUniversalKernel(prefix='s'){
  const source=buildStoneKernelSource(prefix);
  const math=compileMathGraph(source.constraints,{maxStates:500000});
  const basis=anonymousBasis();
  return {
    pure:{
      version:1,
      structures:basis.structures,
      signed_pairs:basis.signed_pairs,
      math
    },
    audit:{
      variable_names_are_scaffolding:true,
      coordinate_measurement_rule:'not supplied by canonical Stone semantics; Delta is retained as a constrained signed relation',
      structure_legend:['Empathy','Practicality','Knowledge','Wisdom','Answerability','Insulation','Absence/null'],
      covered:[
        'entity/referent/orientation','three signed functions','octahedral bound','development L1','experience L2',
        'null/interior/stance','realization r->r-prime','unresolved lateral load','reality-friction',
        'maturity/collapse anchors','vertical sign regions','evidence-warranted region','contextual emphasis','surface decoding'
      ]
    }
  };
}

module.exports={buildStoneKernelSource,compileStoneUniversalKernel};
