"use client";

interface TechItem {
  name: string;
  category: string;
  svg: (props: { className?: string }) => React.ReactNode;
}

const TECH_ITEMS: TechItem[] = [
  {
    name: "Google Gemini 2.5",
    category: "LLM Engine",
    svg: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
          fill="url(#gemini-marquee-grad)"
        />
        <defs>
          <linearGradient id="gemini-marquee-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1A73E8" />
            <stop offset="0.45" stopColor="#8E24AA" />
            <stop offset="1" stopColor="#EA4335" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    name: "OpenAI GPT-4o",
    category: "LLM Engine",
    svg: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="#10A37F">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    ),
  },
  {
    name: "Anthropic Claude 3.5",
    category: "Reasoning LLM",
    svg: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="#D97757">
        <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
      </svg>
    ),
  },
  {
    name: "Backblaze B2",
    category: "Cloud Object Storage",
    svg: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.5 8.2c-.8-1.9-2.3-3.4-4.2-4.2-.6-.3-1.3-.4-2-.4-.4 0-.8.1-1.1.2C9.4 4 9 4.3 8.6 4.7 6.4 6.9 6 10.3 7.6 13c.4.7 1 1.3 1.6 1.7.5.3 1 .6 1.6.7-.4-.7-.6-1.5-.6-2.4 0-2.8 2.2-5 5-5 .8 0 1.6.2 2.3.6v-.4zM12 13.5c-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-2.5-2.5-2.5z" />
      </svg>
    ),
  },
  {
    name: "Pinecone Vector",
    category: "Similarity Index",
    svg: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 6.5v11L12 22l8-4.5v-11L12 2zm0 2.3l6.2 3.5L12 11.3 5.8 7.8 12 4.3zM5.5 9.2l5.5 3.1v6.2l-5.5-3.1V9.2zm7.5 9.3v-6.2l5.5-3.1v6.2l-5.5 3.1z" />
      </svg>
    ),
  },
  {
    name: "Next.js & React 19",
    category: "Web Framework",
    svg: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.82 17.587L9.932 7.429h2.247l5.962 7.731a9.585 9.585 0 0 1-2.321 2.427zm-3.48-7.798l-2.22 2.87V7.429h2.22v2.36z" />
      </svg>
    ),
  },
  {
    name: "Voyage AI",
    category: "Embedding Model",
    svg: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 19.5l3.5 2.5L12 17l6.5 5 3.5-2.5L12 2zm0 4.2l5.7 10-3.9-3-1.8 1.4-1.8-1.4-3.9 3L12 6.2z" />
      </svg>
    ),
  },
  {
    name: "Shopify & Webflow",
    category: "CMS & Storefront",
    svg: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.8 6.2c-.1-.5-.5-.8-1-.8h-2.1c-.2-1.8-1.5-3.4-3.7-3.4s-3.5 1.6-3.7 3.4H6.2c-.5 0-.9.3-1 .8L3.1 20.8c-.1.6.4 1.2 1 1.2h15.8c.6 0 1.1-.6 1-1.2L18.8 6.2zM12 3.5c1.2 0 1.9 1 2 1.9h-4c.1-.9.8-1.9 2-1.9zm-1.8 7.3c0-.4.3-.8.8-.8s.8.4.8.8v2.4c0 .4-.3.8-.8.8s-.8-.4-.8-.8v-2.4zm4.4 2.4c0 .4-.3.8-.8.8s-.8-.4-.8-.8v-2.4c0-.4.3-.8.8-.8s.8.4.8.8v2.4z" />
      </svg>
    ),
  },
  {
    name: "Cloudflare Edge",
    category: "Global CDN Edge",
    svg: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.19 11.23a5.5 5.5 0 0 0-5.19-3.73 5.46 5.46 0 0 0-4.66 2.6A4.5 4.5 0 0 0 5 14.5c0 2.48 2.02 4.5 4.5 4.5h9.72A3.78 3.78 0 0 0 23 15.22a3.78 3.78 0 0 0-3.81-3.99z" />
      </svg>
    ),
  },
];

export function TechMarquee() {
  return (
    <div className="w-full py-10 sm:py-14 overflow-hidden relative [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex items-center anim-marquee gap-7">
        {[...TECH_ITEMS, ...TECH_ITEMS].map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className="flex items-center gap-3.5 px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl border border-zinc-200/90 bg-white shadow-xs hover:border-emerald-500/50 hover:shadow-md dark:border-white/[0.08] dark:bg-[#0E1612] transition-all shrink-0 cursor-default group"
          >
            <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
              <item.svg className="size-6 sm:size-6.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors tracking-tight">
                {item.name}
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 font-medium">
                {item.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
