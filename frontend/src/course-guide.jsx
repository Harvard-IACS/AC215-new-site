import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowDown, ArrowUp, Check, FileText, LoaderCircle, MessageCircle, Minus, RotateCcw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupButton } from '@/components/ui/input-group';
import { AnimatedDisclosure } from './animated-disclosure';
import { DISCUSSION_URL, questions } from './data/course';

function ToolRead({ step, active }) {
  return <AnimatedDisclosure className="tool-read" label={'Inspect read of ' + step.filename}
    summary={<><FileText aria-hidden="true" /><span>Read {step.title}</span>{step.complete ? <Check className="tool-state" aria-label="Complete" /> : active ? <LoaderCircle className="tool-state spinner" aria-label="Reading" /> : <Square className="tool-state" aria-label="Not completed" />}</>}>
    <dl className="tool-values"><dt>Input</dt><dd>{step.filename}</dd>{step.complete ? <><dt>Result</dt><dd><pre>{step.output}</pre></dd></> : null}</dl>
  </AnimatedDisclosure>;
}

function ChatTurn({ turn, onRetry }) {
  const [workOpen, setWorkOpen] = useState(!turn.result);
  const [workCollapsed, setWorkCollapsed] = useState(Boolean(turn.result));
  const [answerVisible, setAnswerVisible] = useState(Boolean(turn.result));
  const hasAnswer = Boolean(turn.result || turn.partial);
  useEffect(() => { if (hasAnswer) setWorkOpen(false); }, [hasAnswer]);
  useEffect(() => { if (hasAnswer && workCollapsed && !workOpen) setAnswerVisible(true); }, [hasAnswer, workCollapsed, workOpen]);
  const done = turn.status !== 'working';
  const count = turn.steps.filter(step => step.complete).length;
  const label = turn.status === 'working' ? (turn.mode === 'sources' ? 'Looking through course notes' : 'Finding the right course notes')
    : turn.status === 'stopped' ? 'Stopped' : turn.status === 'error' ? 'Could not finish' : count ? 'Read ' + count + ' course ' + (count === 1 ? 'note' : 'notes') : 'Checked course notes';
  return <article className="chat-turn" aria-label={'Question: ' + turn.question}>
    <p className="chat-question">{turn.question}</p>
    <AnimatedDisclosure className="work-group" open={workOpen} onOpenChange={value => {setWorkOpen(value); setWorkCollapsed(false);}} onCollapsed={() => setWorkCollapsed(true)}
      summary={<><span className="work-label">{!done ? <LoaderCircle className="spinner" aria-hidden="true" /> : null}{label}</span></>}>
      <div className="work-steps">
        {!turn.steps.length ? <p className="work-progress">{turn.status === 'working' ? 'Checking which information is needed.' : 'No course file was read.'}</p> : null}
        {turn.steps.map(step => <ToolRead key={step.id} step={step} active={!done} />)}
      </div>
    </AnimatedDisclosure>
    {turn.error ? <div className="guide-error" role="alert"><p>{turn.error}</p>{turn.errorCode !== "daily_budget" ? <Button variant="outline" type="button" onClick={() => onRetry(turn.question)}>Try again</Button> : null}<a href={DISCUSSION_URL} target="_blank" rel="noreferrer">Ask on Ed Discussion</a></div> : null}
    {turn.status === 'stopped' ? <p className="chat-stopped" role="status">Response stopped. You can ask again.</p> : null}
    {hasAnswer && answerVisible ? <div className="chat-result answer-reveal" aria-live={turn.result ? "polite" : "off"}>
      {turn.result?.mode === 'sources' ? <p className="guide-mode-note">Notes preview. Source excerpts, without a model.</p> : null}
      <div className="guide-answer"><Markdown remarkPlugins={[remarkGfm]} components={{a:({href,children})=><a href={href} target="_blank" rel="noreferrer">{children}</a>}}>{turn.result?.answer ?? turn.partial}</Markdown></div>
    </div> : null}
  </article>;
}

export default function CourseGuide({ open, onOpenChange, initialQuestion }) {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [inputError, setInputError] = useState('');
  const [showLatest, setShowLatest] = useState(false);
  const inputRef = useRef(null), requestRef = useRef(null), initialRef = useRef(''), busyRef = useRef(false), nextId = useRef(0);
  const scrollRef = useRef(null), contentRef = useRef(null), followingRef = useRef(true);
  useEffect(() => () => requestRef.current?.controller.abort(), []);
  useEffect(() => {
    if (initialQuestion && initialRef.current !== initialQuestion) {
      initialRef.current = initialQuestion; ask(initialQuestion);
    }
  }, [initialQuestion]);
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (followingRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
    observer.observe(content); return () => observer.disconnect();
  }, [open]);
  useLayoutEffect(() => {
    if (followingRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    else if (turns.length) setShowLatest(true);
  }, [turns]);
  function updateTurn(id, change) { setTurns(items => items.map(item => item.id === id ? {...item, ...change(item)} : item)); }
  async function ask(value) {
    if (busyRef.current) return;
    const question = value.trim();
    if (question.length < 3) { setInputError('Write a question of at least three characters.'); inputRef.current?.focus(); return; }
    const id = ++nextId.current, controller = new AbortController();
    requestRef.current = {id, controller}; busyRef.current = true; followingRef.current = true;
    setBusy(true); setInputError(''); setDraft(''); setShowLatest(false);
    setTurns(items => [...items, {id, question, steps: [], status: 'working', mode: null, result: null}]);
    try {
      const response = await fetch('/api/chat/stream', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({question}), signal:controller.signal});
      if (!response.ok || !response.body) throw new Error('The course guide could not connect. Please try again.');
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let buffer = '', finished = false;
      function receive(event) {
        if (controller.signal.aborted) return;
        if (event.type === 'started') updateTurn(id, () => ({mode:event.mode}));
        if (event.type === 'read_start') updateTurn(id, item => ({steps:[...item.steps,{...event,complete:false}]}));
        if (event.type === 'read_complete') updateTurn(id, item => ({steps:item.steps.map(step => step.id === event.id ? {...event,complete:true} : step)}));
        if (event.type === 'answer_delta') updateTurn(id, item => ({partial: (item.partial ?? '') + event.delta}));
        if (event.type === 'answer') { finished = true; updateTurn(id, () => ({result:event,status:'complete'})); }
        if (event.type === 'error') {
          finished = true;
          updateTurn(id, () => ({status: 'error', error: event.message, errorCode: event.code, partial: null}));
        }
      }
      while (true) {
        const {done,value} = await reader.read();
        buffer += decoder.decode(value, {stream:!done});
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0,boundary); buffer = buffer.slice(boundary+2);
          const data = block.split('\n').filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n');
          if (data) receive(JSON.parse(data));
        }
        if (done) break;
      }
      if (!finished) throw new Error('The response ended before an answer was ready. Please try again.');
    } catch (failure) {
      if (failure.name !== 'AbortError') updateTurn(id, () => ({status:'error',partial:null,error:failure.message || 'The course guide could not connect. Please try again.'}));
    } finally {
      if (!controller.signal.aborted) { busyRef.current = false; setBusy(false); requestRef.current = null; }
    }
  }
  function stop() {
    const current = requestRef.current;
    if (!current) return;
    current.controller.abort(); requestRef.current = null; busyRef.current = false; setBusy(false);
    updateTurn(current.id, () => ({status:'stopped',partial:null}));
  }
  function clear() {
    requestRef.current?.controller.abort(); requestRef.current = null; busyRef.current = false;
    setBusy(false); setTurns([]); setDraft(''); setInputError(''); initialRef.current = ''; inputRef.current?.focus();
  }
  function latest() { followingRef.current = true; setShowLatest(false); scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); }
  return <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false} disablePointerDismissal>
    <Dialog.Portal keepMounted>
      <Dialog.Popup id="course-chat" className="course-chat" initialFocus={type => type === 'touch' ? false : inputRef.current} finalFocus={() => document.querySelector('.chat-launcher')}>
        <MessageCircle className="chat-morph-icon" aria-hidden="true" />
        <header className="chat-header">
          <Dialog.Title className="sr-only">Ask AC215</Dialog.Title>
          <div className="chat-header-actions"><Button type="button" variant="ghost" size="icon" aria-label="Clear conversation" onClick={clear}><RotateCcw aria-hidden="true" /></Button><Dialog.Close render={<Button type="button" variant="ghost" size="icon" aria-label="Minimize chat" />}><Minus aria-hidden="true" /></Dialog.Close></div>
        </header>
        <div className="chat-scroll" ref={scrollRef} onScroll={event => {const el=event.currentTarget;followingRef.current=el.scrollHeight-el.scrollTop-el.clientHeight<48;if(followingRef.current)setShowLatest(false);}}>
          <div className="chat-content" ref={contentRef}>
            {!turns.length ? <div className="guide-suggestions"><p>What would you like to know?</p>{questions.map(item => <Button key={item} variant="outline" type="button" onClick={() => ask(item)}>{item}</Button>)}</div> : null}
            {turns.map(turn => <ChatTurn key={turn.id} turn={turn} onRetry={ask} />)}
          </div>
          {showLatest ? <Button className="jump-latest" type="button" variant="outline" onClick={latest}>Latest answer<ArrowDown data-icon="inline-end" aria-hidden="true" /></Button> : null}
        </div>
        <form className="chat-composer" onSubmit={event => {event.preventDefault();ask(draft);}}>
          <FieldGroup><Field data-invalid={Boolean(inputError)}>
            <FieldLabel className="sr-only" htmlFor="course-question">Your course question</FieldLabel>
            <InputGroup aria-invalid={Boolean(inputError)}>
            <InputGroupTextarea id="course-question" ref={inputRef} name="question" rows={2} autoComplete="off" placeholder="Ask about AC215…" aria-describedby="chat-ai-notice" maxLength={800} value={draft} onChange={event => setDraft(event.target.value)} aria-invalid={Boolean(inputError)}
              onKeyDown={event => {if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();ask(draft);}}} />
            <InputGroupAddon align="block-end" className="composer-actions">{busy ? <InputGroupButton type="button" aria-label="Stop response" onClick={stop}><Square aria-hidden="true" /></InputGroupButton> : <InputGroupButton type="submit" aria-label="Send question" aria-disabled={draft.trim().length<3}><ArrowUp aria-hidden="true" /></InputGroupButton>}</InputGroupAddon>
            <p id="chat-ai-notice" className="chat-ai-notice">AI can make mistakes. You’re responsible for understanding course material and policies.</p>
            </InputGroup>
            {inputError ? <p className="composer-error" role="alert">{inputError}</p> : null}
          </Field></FieldGroup>
        </form>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
