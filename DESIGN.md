# DESIGN.md — Architecture and Technical Decisions

## 1. Stale Request Cancellation (`AbortController` vs. Relevance Flag)

### Implementation in the Project

The lifecycle of network requests is managed by `SearchController` (`src/core/searchController.ts`) and the network layer `searchCountries` (`src/api/countriesApi.ts`):

1. `SearchController` maintains a reference `currentAbortController: AbortController | null`.
2. On **every** input change (including clearing the input field), `handleInput(rawInput)` immediately calls `this.abortInFlight()` without waiting for the `debounce` timer to fire.
3. Inside `searchCountries`, the external `AbortSignal` from the controller is composed with a timeout signal `AbortSignal.timeout(8000)` via `AbortSignal.any([externalSignal, timeoutSignal])`.
4. In the `catch` block, caught errors are passed to `classifyError` (`src/utils/errors.ts`), which explicitly distinguishes manual cancellation (`DOMException` with `name === 'AbortError'`) from request timeouts (`DOMException` with `name === 'TimeoutError'`). Manual cancellations are silently ignored and do not transition the UI into an error state.
5. In the bonus caching layer `CachedCountrySearch` (`src/api/cacheService.ts`), the shared in-flight promise is decoupled from the initiator's `AbortSignal`, and each caller wraps the shared promise using `raceWithSignal(sharedPromise, signal)`. This ensures that cancelling a request by one caller rejects only its own wrapper with `AbortError` without aborting the shared network request for other concurrent callers.

### Why `AbortController` Instead of a Boolean Flag or Request Counter (`requestId`)

- **Network and browser resource efficiency:** A boolean flag (`isCurrent`) only discards an already downloaded response at the JavaScript level, while the browser keeps the underlying TCP/HTTP connection open and finishes downloading and parsing the stale JSON payload. Calling `AbortController.abort()` terminates the HTTP request at the browser network stack level.
- **Preventing race conditions during the `debounce` window:** If a request for `"sp"` is already in flight and the user continues typing `"spain"`, invoking `abort()` immediately on the next keystroke guarantees that a slow response for `"sp"` cannot resolve and overwrite the UI during the 350 ms debounce window of the new query.
- **Declarative composition with timeouts:** `AbortSignal` is a standard Web API primitive that allows combining multiple cancellation triggers (user input and request timeout) cleanly without managing multiple manual flags and timers.

---

## 2. Rationale for the `debounce` Delay (`350 ms`)

In `SearchController` (`src/core/searchController.ts`, constant `SEARCH_DEBOUNCE_MS = 350`), the debounce delay is set to **350 ms**.

- **What happens if `debounce` is removed (`0 ms`):**
  Typing a 14-character query (e.g., `United Kingdom`) would trigger 14 consecutive HTTP requests (13 of which would be immediately aborted). This creates unnecessary load on the API, wastes user bandwidth, and causes constant visual flickering of the `loading` state on every keystroke.
- **What happens if the delay is too long (`1000+ ms`):**
  The interface feels sluggish and unresponsive: after finishing typing, the user would stare at an empty or outdated screen for a full second before even seeing a loading indicator.
- **Why `300–400 ms` (`350 ms`) is optimal:**
  The average inter-keystroke interval during normal typing is 150–250 ms. A 350 ms delay allows the user to type a full word or syllable uninterrupted while filtering out intermediate keystrokes, yet triggers almost immediately once typing pauses, preserving the feel of a live instant search.

---

## 3. Algorithmic Complexity Analysis (Big O)

### API Response Mapping (`mapCountryResponse` in `src/api/mapper.ts`)

Let $N$ be the number of countries in the API response array, $L$ be the average number of languages per country, and $C$ be the average number of currencies per country.

- **Time Complexity:** $O(N \cdot (L + C))$. `mapCountryResponse` iterates linearly over the array of $N$ raw entries (`rawList.map`). For each country, it iterates over its languages ($O(L)$) and currencies ($O(C)$). Since $L$ and $C$ are bounded by small constants in practice (typically 1–4 items, rarely exceeding 10), the complexity scales linearly with the number of countries: **$O(N)$**.
- **Space Complexity:** $O(N \cdot (L + C))$, or **$O(N)$** with respect to the number of countries, as a new array of `Country` objects of the same length is allocated without mutating the input data.

### Caching and In-Flight Request Deduplication (`CachedCountrySearch` in `src/api/cacheService.ts`)

Let $K$ be the number of unique cached search queries and $M$ be the length of a query string.

- **Cache lookup (`cache.get(normalizedKey)`):** **$O(1)$** average time complexity using V8's hash-table-backed `Map` (string hashing takes $O(M)$, where $M$ is a short user input string).
- **In-flight deduplication check and registration (`inFlight.get` / `inFlight.set`):** **$O(1)$** average time complexity.
- **Space Complexity:** **$O(K \cdot R)$**, where $R$ is the average size of the mapped country list stored per cached query.

### Search History (`SearchHistoryService` in `src/core/historyService.ts`)

- **Time and Space Complexity:** **$O(H)$**, where $H \le 8$ (`MAX_HISTORY_ITEMS = 8`). Because the history list size is strictly capped by a small constant, deduplication filtering and JSON serialization to `localStorage` run in **$O(1)$** amortized time and space.

---

## 4. Clean Code Principles Applied

1. **Separation of Concerns and DOM Independence:**
   All business logic—search orchestration, request cancellation, error classification, caching, and response mapping—is isolated inside `src/core/` and `src/api/` without any direct references to `document` or global `window.fetch` (via dependency injection of `fetcher`). The UI layer (`src/ui/`) is strictly responsible for rendering `SearchState`.
2. **Pure Functions and Immutability:**
   `mapCountryResponse` (`src/api/mapper.ts`) and `classifyError` (`src/utils/errors.ts`) are deterministic pure functions: they never mutate their input arguments (e.g., cloning arrays via `[...raw.borders]`) and produce no side effects.
3. **Dependency Inversion for Testability:**
   `SearchController` (`src/core/searchController.ts`) and `CachedCountrySearch` (`src/api/cacheService.ts`) accept their data-fetching function (`fetcher`) through constructor injection. This enables fast, deterministic unit and race-condition testing in Node.js without a browser or live network.
4. **Architectural XSS Prevention:**
   In `src/ui/domHelpers.ts` (`createElement`) and all UI renderers (`src/ui/renderers.ts`, `src/ui/modal.ts`), `innerHTML` and `insertAdjacentHTML` are completely avoided; all dynamic and API-sourced strings are inserted exclusively via `textContent` and `setAttribute`.
5. **Explicit State Modeling (Finite State Machine):**
   Instead of error-prone combinations of independent boolean flags (`isLoading`, `isError`, `isEmpty`), the application state is modeled via a discriminated union `SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'` (`src/core/searchController.ts`), making impossible UI states (such as showing a spinner and an error message simultaneously) unrepresentable.
