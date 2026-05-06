"use client";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold">Sports Ranking</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-[13px] text-zinc-400 hover:text-white transition-colors px-4 py-2">Entrar</a>
            <a href="/signup" className="text-[13px] bg-white hover:bg-zinc-100 text-zinc-900 font-medium px-4 py-2 rounded-lg transition-colors">Criar Conta</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-500/[0.07] rounded-full blur-[120px]" />
          <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-violet-500/[0.05] rounded-full blur-[100px]" />
          <div className="absolute top-60 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/[0.04] rounded-full blur-[120px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] text-zinc-400">Sistema profissional de pontuacao</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
              Ranking em
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              tempo real
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sistema completo para gerenciar pontuacoes e rankings de competicoes esportivas.
            Notas dos arbitros, medias ponderadas e classificacao ao vivo.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/signup"
              className="inline-flex items-center justify-center bg-white hover:bg-zinc-100 text-zinc-900 font-semibold px-7 py-3.5 rounded-xl text-[15px] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              Comecar agora
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a href="/display"
              className="inline-flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 font-medium px-7 py-3.5 rounded-xl text-[15px] transition-all">
              Ver ranking ao vivo
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "10", label: "Arbitros simultaneos" },
              { value: "9", label: "Categorias" },
              { value: "6", label: "Criterios de avaliacao" },
              { value: "2s", label: "Atualizacao do ranking" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-[12px] text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Como funciona</h2>
            <p className="text-zinc-500 max-w-lg mx-auto">Tres passos simples para gerenciar sua competicao</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "Configurar",
                desc: "Crie categorias, adicione atletas e registre os arbitros no sistema",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Avaliar",
                desc: "Arbitros dao notas de 0 a 4 pelo celular. O sistema calcula medias e detecta outliers",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Classificar",
                desc: "Ranking atualiza ao vivo no telao. Selecione qual categoria exibir para o publico",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
              },
            ].map((feature) => (
              <div key={feature.step} className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl p-7 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-zinc-400 group-hover:text-white transition-all">
                    {feature.icon}
                  </div>
                  <span className="text-[11px] text-zinc-600 font-mono">{feature.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories showcase */}
      <section className="relative px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-5 text-center">Categorias suportadas</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {["Open Bodybuilding", "Classic Physique", "Men's Physique", "Culturismo Classico", "Wellness", "Bikini", "Figure", "Fitguy", "Fitgirl"].map((cat) => (
              <span key={cat} className="bg-white/[0.03] border border-white/[0.05] text-zinc-400 text-[13px] px-4 py-2 rounded-full">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/[0.05] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Pronto para comecar?</h2>
          <p className="text-zinc-500 mb-8">Configure sua competicao em minutos</p>
          <a href="/signup"
            className="inline-flex items-center bg-white hover:bg-zinc-100 text-zinc-900 font-semibold px-8 py-4 rounded-xl text-[15px] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            Criar conta gratuita
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center">
              <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[13px] text-zinc-600">Sports Ranking</span>
          </div>
          <p className="text-[12px] text-zinc-700">Sistema de pontuacao para competicoes</p>
        </div>
      </footer>
    </div>
  );
}
