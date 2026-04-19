
import { useState } from 'react';
import { usePda } from '../../store/PdaContext';
import { EXAMPLES } from '../../lib/examples';
import { runPDA } from '../../lib/pdaEngine';

// API key is baked in at build time from .env (VITE_GROQ_API_KEY)
// Users never need to enter a key — this is a website, not a dev tool.
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a formal automata theory expert. You construct correct, complete Nondeterministic Pushdown Automata (NPDA).

CRITICAL RULES:
1. Use acceptance by FINAL STATE (not empty stack)
2. Z is always the bottom-of-stack marker and the initial stack symbol
3. Every transition = {from, input, top, to, push}
   - input: single character OR "ε" (epsilon = don't consume input)
   - top: single character to pop OR "ε" (don't pop, don't check)
   - push: string to push (LEFT = new top) OR "ε" (just pop, push nothing)
4. Be COMPLETE — cover ALL combinations of relevant symbols for EVERY state
5. IMPORTANT: Stack symbols MUST be single characters. For brackets use proxy letters: ( → P, [ → B, { → C
6. NON-CFL GUARD: If the requested language is NOT context-free (e.g. aⁿbⁿcⁿ with ALL THREE counts equal, or aⁿbⁿcⁿdⁿ), you MUST still return valid JSON but set "error" field explaining it is not context-free, and suggest a CFL alternative. Example: {"error":"aⁿbⁿcⁿ is not a context-free language and cannot be recognized by any PDA. Try aⁿbⁿcᵐ (equal a and b, any c) or aᵐbⁿcⁿ (any a, equal b and c) instead.","states":[],"startState":"","acceptStates":[],"startStackSymbol":"Z","transitions":[],"description":"","testStrings":{"accept":[],"reject":[]}}

WORKED EXAMPLE 1 — wcwᴿ (w·c·reverse(w) over alphabet {a,b}):
{
  "states": ["q0","q1","q2"],
  "startState": "q0",
  "acceptStates": ["q2"],
  "startStackSymbol": "Z",
  "transitions": [
    {"from":"q0","input":"a","top":"Z","to":"q0","push":"AZ"},
    {"from":"q0","input":"a","top":"A","to":"q0","push":"AA"},
    {"from":"q0","input":"a","top":"B","to":"q0","push":"AB"},
    {"from":"q0","input":"b","top":"Z","to":"q0","push":"BZ"},
    {"from":"q0","input":"b","top":"A","to":"q0","push":"BA"},
    {"from":"q0","input":"b","top":"B","to":"q0","push":"BB"},
    {"from":"q0","input":"c","top":"A","to":"q1","push":"A"},
    {"from":"q0","input":"c","top":"B","to":"q1","push":"B"},
    {"from":"q0","input":"c","top":"Z","to":"q1","push":"Z"},
    {"from":"q1","input":"a","top":"A","to":"q1","push":"ε"},
    {"from":"q1","input":"b","top":"B","to":"q1","push":"ε"},
    {"from":"q1","input":"ε","top":"Z","to":"q2","push":"Z"}
  ],
  "description": "Strings of the form wcwᴿ where w is over {a,b}",
  "testStrings": {"accept":["abcba","aabcbaa","bcb"],"reject":["abc","abab","cbc"]}
}

WORKED EXAMPLE 2 — balanced parentheses () [] {} (ALWAYS use proxy letters P for (, B for [, C for {):
{
  "states": ["q0","q1"],
  "startState": "q0",
  "acceptStates": ["q1"],
  "startStackSymbol": "Z",
  "transitions": [
    {"from":"q0","input":"(","top":"Z","to":"q0","push":"PZ"},
    {"from":"q0","input":"(","top":"P","to":"q0","push":"PP"},
    {"from":"q0","input":"(","top":"B","to":"q0","push":"PB"},
    {"from":"q0","input":"(","top":"C","to":"q0","push":"PC"},
    {"from":"q0","input":")","top":"P","to":"q0","push":"ε"},
    {"from":"q0","input":"[","top":"Z","to":"q0","push":"BZ"},
    {"from":"q0","input":"[","top":"P","to":"q0","push":"BP"},
    {"from":"q0","input":"[","top":"B","to":"q0","push":"BB"},
    {"from":"q0","input":"[","top":"C","to":"q0","push":"BC"},
    {"from":"q0","input":"]","top":"B","to":"q0","push":"ε"},
    {"from":"q0","input":"{","top":"Z","to":"q0","push":"CZ"},
    {"from":"q0","input":"{","top":"P","to":"q0","push":"CP"},
    {"from":"q0","input":"{","top":"B","to":"q0","push":"CB"},
    {"from":"q0","input":"{","top":"C","to":"q0","push":"CC"},
    {"from":"q0","input":"}","top":"C","to":"q0","push":"ε"},
    {"from":"q0","input":"ε","top":"Z","to":"q1","push":"Z"}
  ],
  "description": "Balanced parentheses with (), [], and {}",
  "testStrings": {"accept":["()","[]{}","[{}()]","({[]})"],"reject":["(]","[)","({)}","(()"]}
}

WORKED EXAMPLE 3 — aⁿbᵐcⁿ (equal a's and c's, ANY number of b's in between):
KEY INSIGHT: When a symbol in the middle must be SKIPPED (not counted), loop through it WITHOUT touching the stack.
{
  "states": ["q0","q1","q2","q3"],
  "startState": "q0",
  "acceptStates": ["q3"],
  "startStackSymbol": "Z",
  "transitions": [
    {"from":"q0","input":"a","top":"Z","to":"q0","push":"AZ"},
    {"from":"q0","input":"a","top":"A","to":"q0","push":"AA"},
    {"from":"q0","input":"b","top":"A","to":"q1","push":"A"},
    {"from":"q0","input":"b","top":"Z","to":"q1","push":"Z"},
    {"from":"q0","input":"ε","top":"Z","to":"q3","push":"Z"},
    {"from":"q1","input":"b","top":"A","to":"q1","push":"A"},
    {"from":"q1","input":"b","top":"Z","to":"q1","push":"Z"},
    {"from":"q1","input":"c","top":"A","to":"q2","push":"ε"},
    {"from":"q1","input":"ε","top":"Z","to":"q3","push":"Z"},
    {"from":"q2","input":"c","top":"A","to":"q2","push":"ε"},
    {"from":"q2","input":"ε","top":"Z","to":"q3","push":"Z"}
  ],
  "description": "Strings of the form aⁿbᵐcⁿ — equal a's and c's with any b's in between",
  "testStrings": {"accept":["ac","abc","aabcc","aabbbcc","aaabbbccc"],"reject":["abc".slice(0,2),"abbc","aabbc","abcc","a","c"]}
}

CRITICAL PATTERN — When skipping a middle symbol (like b in aⁿbᵐcⁿ):
- DO NOT push or pop anything for the skipped symbol
- Use push equal to the SAME top value (i.e. keep the stack unchanged)
- This way the stack only tracks the outer counted symbols

Notice: q0 needs transitions for EACH symbol × EACH possible stack top (Z, A, B, etc.).
RESPOND WITH ONLY A SINGLE JSON OBJECT — no markdown, no backticks, no prose.`;

const USER_PROMPT = (q) =>
  `Build a correct, complete NPDA for this language: "${q}"\n\nRemember:\n- Cover ALL symbol/stack-top combinations in each state\n- Use final state acceptance\n- Keep Z as bottom-of-stack\n- Output ONLY the JSON object`;

export default function AIGenerator({ onGoSimulate }) {
  const { loadDef } = usePda();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function callGroq() {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT(query.trim()) },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${resp.status}`;
      if (resp.status === 401) throw new Error('AI service configuration error. Contact the site owner.');
      if (resp.status === 429) throw new Error('AI is busy — wait a moment and try again.');
      throw new Error(msg);
    }
    return resp.json();
  }

  function parseDef(raw) {
    raw = raw.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) raw = match[0];
    return JSON.parse(raw);
  }

  function validateDef(def) {
    const warns = [];
    if (!def.states?.length) warns.push('No states defined.');
    if (!def.startState) warns.push('No start state.');
    if (!def.acceptStates?.length) warns.push('No accept states.');
    if (!def.transitions?.length) warns.push('No transitions defined.');

    const accepts = def.testStrings?.accept || [];
    const rejects = def.testStrings?.reject || [];
    const cfg = {
      states: def.states || [],
      startState: def.startState || '',
      acceptStates: new Set(def.acceptStates || []),
      transitions: (def.transitions || []).filter(t => t.from && t.to),
      initSymbol: def.startStackSymbol || 'Z',
    };

    let passCount = 0, failCount = 0, failExamples = [];
    for (const s of accepts) {
      const r = runPDA(s, cfg);
      if (r.accepted) passCount++;
      else { failCount++; failExamples.push(`"${s}" should ACCEPT`); }
    }
    for (const s of rejects) {
      const r = runPDA(s, cfg);
      if (!r.accepted) passCount++;
      else { failCount++; failExamples.push(`"${s}" should REJECT`); }
    }

    return { warns, passCount, failCount, failExamples, total: accepts.length + rejects.length };
  }

  // Detect common non-CFL language requests client-side
  function detectNonCFL(text) {
    const t = text.toLowerCase().replace(/[ⁿᵐ]/g, 'n');
    // Pattern: "anbncn" or "all three equal" or "equal a b c" etc.
    const patterns = [
      /a\s*n\s*b\s*n\s*c\s*n(?!\s*d)/i,           // aⁿbⁿcⁿ
      /a\s*n\s*b\s*n\s*c\s*n\s*d\s*n/i,            // aⁿbⁿcⁿdⁿ
      /all\s+three\s+(?:counts?\s+)?equal/i,        // "all three equal"
      /equal\s+(?:number|count|no\.?)\s+(?:of\s+)?a.{0,6}b.{0,6}c/i, // "equal number of a, b, c"
      /equal\s+a.{0,4}s?.{0,4}b.{0,4}s?.{0,6}(?:and\s+)?c/i,        // "equal a's b's and c's"
    ];
    return patterns.some(p => p.test(text) || p.test(t));
  }

  async function generate() {
    if (!query.trim()) return;

    // Client-side non-CFL guard
    if (detectNonCFL(query)) {
      setResult({
        type: 'err',
        html: `<strong>⚠ Not a Context-Free Language</strong><br/><br/>` +
          `The language <strong>aⁿbⁿcⁿ</strong> (where all three counts must be equal) is <strong>not context-free</strong> ` +
          `and cannot be recognized by any PDA. This is proven by the <em>Pumping Lemma for CFLs</em>.<br/><br/>` +
          `A PDA has only <strong>one stack</strong> — it can match two groups (like a's vs b's) but not three simultaneously.<br/><br/>` +
          `<strong>Try these valid alternatives instead:</strong><br/>` +
          `• <strong>aⁿbⁿcᵐ</strong> — equal a's and b's, then any c's<br/>` +
          `• <strong>aᵐbⁿcⁿ</strong> — any a's, then equal b's and c's<br/>` +
          `• <strong>aⁿbᵐcⁿ</strong> — equal a's and c's, any b's in between`,
      });
      return;
    }

    if (!GROQ_KEY || GROQ_KEY === 'paste_your_groq_key_here') {
      setResult({
        type: 'err',
        html: '<strong>AI not configured.</strong><br/>Add <code>VITE_GROQ_API_KEY=gsk_...</code> to your <code>.env</code> file and restart the dev server.',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = await callGroq();
      const raw = data.choices?.[0]?.message?.content || '';
      const def = parseDef(raw);

      // Non-CFL guard: AI returned an error field
      if (def.error) {
        setResult({
          type: 'err',
          html: `<strong>⚠ Not a Context-Free Language</strong><br/><br/>${def.error}`,
        });
        setLoading(false);
        return;
      }

      const { warns, passCount, failCount, failExamples, total } = validateDef(def);

      loadDef(def);

      let html = '';
      if (failCount === 0 && total > 0) {
        html += `<strong style="color:var(--green)">✔ PDA built & verified! (${passCount}/${total} tests pass)</strong><br/><br/>`;
      } else if (failCount > 0) {
        html += `<strong style="color:var(--yellow2)">⚠ PDA built but ${failCount}/${total} test(s) failed</strong><br/>`;
        html += `<small style="color:var(--text3)">${failExamples.slice(0, 3).join(' · ')}</small><br/><br/>`;
      } else {
        html += `<strong style="color:var(--green)">✔ PDA built successfully!</strong><br/><br/>`;
      }

      html += `<span style="color:var(--text2)">${def.description || ''}</span><br/><br/>`;
      html += `<strong>${def.states.length} states</strong> · <strong>${def.transitions.length} transitions</strong><br/>`;
      if (def.testStrings?.accept?.length)
        html += `<br/>✔ Accept: ${def.testStrings.accept.map(s => `"${s}"`).join(', ')}`;
      if (def.testStrings?.reject?.length)
        html += `<br/>✘ Reject: ${def.testStrings.reject.map(s => `"${s}"`).join(', ')}`;
      if (warns.length)
        html += `<br/><br/><small style="color:var(--red)">${warns.join(' ')}</small>`;

      setResult({ type: failCount > 0 ? 'warn' : 'ok', html });
    } catch (err) {
      setResult({
        type: 'err',
        html: `<strong>Error:</strong> ${err.message}<br/><small>Try rephrasing your description.</small>`,
      });
    }
    setLoading(false);
  }

  return (
    <div className="ai-wrap">
      <div className="ai-hint">
        Describe any language in plain English — AI builds the PDA automatically.
        <span style={{ color: 'var(--text3)' }}> Powered by Llama 3.3 70B.</span>
      </div>

      <div className="ai-input-wrap">
        <textarea
          className="ai-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`e.g. strings with equal a's and b's\nstrings of form wcwᴿ over {a,b}\nbalanced brackets with () [] {}`}
          rows={3}
          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generate()}
        />
        <button className="ai-send" disabled={loading} onClick={generate}>
          {loading ? '...' : 'Generate'}
        </button>
      </div>

      <div className="ai-hint">Examples:</div>
      <div className="example-chips">
        {EXAMPLES.map((ex, i) => (
          <span key={i} className="chip" onClick={() => setQuery(ex)}>{ex}</span>
        ))}
      </div>

      {result && (
        <div
          className={`ai-result ${result.type === 'warn' ? '' : result.type}`}
          style={result.type === 'warn' ? {
            border: '1px solid var(--yellow)',
            background: 'rgba(210,153,34,.06)',
            color: 'var(--yellow2)',
          } : {}}
        >
          <div dangerouslySetInnerHTML={{ __html: result.html }} />
          {(result.type === 'ok' || result.type === 'warn') && (
            <button
              className="btn btn-blue"
              style={{ fontSize: '10px', padding: '4px 12px', marginTop: '10px' }}
              onClick={onGoSimulate}
            >
              ▶ Go to Simulate →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
