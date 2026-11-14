// Hash 路由：#/  #/editor/:id  #/review  #/review/:id  #/admin  #/stats  #/share/:token
export interface Route {
  name: string;
  params: Record<string, string>;
}

function parse(): Route {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'dashboard', params: {} };
  const name = parts[0];
  if (name === 'editor' && parts[1]) return { name: 'editor', params: { id: parts[1] } };
  if (name === 'review') {
    return parts[1] ? { name: 'review-detail', params: { id: parts[1] } } : { name: 'review', params: {} };
  }
  if (name === 'share' && parts[1]) return { name: 'share', params: { token: parts[1] } };
  if (name === 'admin') return { name: 'admin', params: {} };
  if (name === 'stats') return { name: 'stats', params: {} };
  return { name: 'dashboard', params: {} };
}

type RouteHandler = (route: Route) => void;

class Router {
  private handlers = new Set<RouteHandler>();
  readonly route: Route = parse();

  constructor() {
    window.addEventListener('hashchange', () => {
      const r = parse();
      (this as { route: Route }).route = r;
      this.handlers.forEach((h) => h(r));
    });
  }

  onChange(h: RouteHandler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  go(path: string): void {
    location.hash = path;
  }

  get current(): Route {
    return parse();
  }
}

export const router = new Router();
