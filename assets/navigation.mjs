export function questionFromHash(hash) {
  if (!hash.startsWith('#q=')) return null;
  try { const id=decodeURIComponent(hash.slice(3)); return /^gallery-[a-z0-9-]+$/.test(id)?id:null; } catch { return null; }
}

export function clearQuestionUrl({location,history}) {
  if (location.hash.startsWith('#q=')) history.replaceState(null,'',location.pathname+location.search);
}

// Native document anchors, including the accessibility skip link, keep the
// current view. Only an actual question-route change starts/leaves a round.
export function questionRouteChange(oldURL,newURL) {
  const before=new URL(oldURL).hash, after=new URL(newURL).hash;
  if (after === '#main') return null;
  if (after.startsWith('#q=') || before.startsWith('#q=')) return {id:questionFromHash(after)};
  return null;
}

export function followsInPlace(event,link) {
  return !event.defaultPrevented && event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && (!link.target || link.target === '_self') && !link.hasAttribute('download');
}

export function quizShortcut(event,element) {
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (element?.matches('input,select,textarea') || element?.isContentEditable) return null;
  if (event.key === 'Enter' && element?.matches('button,a,summary')) return null;
  if (/^[1-4]$/.test(event.key)) return {action:'answer',index:Number(event.key)-1};
  const action={Enter:'advance',ArrowLeft:'previous',ArrowRight:'next'}[event.key];
  return action ? {action} : null;
}
