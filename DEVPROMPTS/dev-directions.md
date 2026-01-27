Frontend:
- Design language of the app is Apple-like - sophisticated and elegant.
- Use tailwind for styling
- The app will treat both mobile and desktop as first class citizens. UI should be 100% usable and delighftul on a phone and use the additional screen space available on a desktop well.

Backend:
- use uv (instead of pip or python venv) to manage python versions, virtual environments, dependencies etc.

General Development Practices:
- When implementing a functionality, lookup the internet for reputed and reliable sources on best practices and examples of the implementation, also look up documentation of the authoritative sources for the technologies about to be used.
- You have chrome-devtools tool available. Use it to test or verify functionality as needed.
- There will be no synchronous calls anywhere in the application. Everything will be asynchronous by design and fault tolerant.
- The app is a delecate dance between LLM calls and parsing the responses. Whenever we change the format of response we request from an LLM, make sure we cascade that change everywhere in the app. 