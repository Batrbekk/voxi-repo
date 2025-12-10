export function AuthDecorator() {
  return (
    <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex overflow-hidden">
      <div className="absolute inset-0 bg-[#09090F]" />

      {/* Decorative gradient blobs */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div
          className="absolute -top-20 -left-40 opacity-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-3xl"
        />
        <div
          className="absolute -bottom-40 -right-20 opacity-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 blur-3xl"
        />
        <div
          className="absolute top-0 right-0 w-[250px] h-[250px] rounded-full bg-gradient-to-br from-green-400 to-emerald-500 blur-2xl animate-pulse"
          style={{ animationDuration: '10s' }}
        />
        <div
          className="absolute bottom-10 left-0 w-[200px] h-[200px] rounded-full bg-gradient-to-br from-orange-400 to-red-500 blur-2xl animate-pulse"
          style={{ animationDuration: '15s' }}
        />
      </div>

      <div className="relative z-20 flex items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span className="text-2xl font-bold">Voxi</span>
        </div>
      </div>

      <div className="relative z-20 mt-auto">
        <blockquote className="space-y-2">
          <p className="text-lg">
            &ldquo;Voxi полностью трансформировал наш подход к взаимодействию с клиентами.
            AI-агенты работают круглосуточно и обрабатывают звонки с невероятной точностью.&rdquo;
          </p>
          <footer className="text-sm">Александр Петров, CEO TechStart</footer>
        </blockquote>
      </div>
    </div>
  );
}
