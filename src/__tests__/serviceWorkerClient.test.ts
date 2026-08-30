import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerServiceWorker } from '../serviceWorkerClient';

const OPTIONS = {
  dictionaryUrl: '/wordsalad/dictionaries/fr.txt',
  scriptUrl: '/wordsalad/sw.js',
};

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing where service workers are unsupported', () => {
    expect(() => {
      registerServiceWorker(OPTIONS);
    }).not.toThrow();
  });

  it('registers the worker and names the word list to keep', async () => {
    const postMessage = vi.fn();
    const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({ active: { postMessage } }),
        register,
      },
    });

    registerServiceWorker(OPTIONS);
    expect(register).toHaveBeenCalledWith('/wordsalad/sw.js');
    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({
        type: 'keep-dictionary',
        url: '/wordsalad/dictionaries/fr.txt',
      });
    });
  });

  it('swallows a refused registration', async () => {
    const register = vi.fn().mockRejectedValue(new Error('SecurityError'));
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: new Promise(() => {
          // Never settles: nothing activates after a refusal.
        }),
        register,
      },
    });
    registerServiceWorker(OPTIONS);
    await Promise.resolve();
    expect(register).toHaveBeenCalledOnce();
  });
});
