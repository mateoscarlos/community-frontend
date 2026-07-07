'use client'

import { useTranslation } from 'react-i18next'
import { AppNav } from '@/components/layout/AppNav'

const MOCK_POSTS = [
  {
    slug: 'round-1-complete',
    title: 'Round 1 is complete — look what you built',
    date: '2026-03-08',
    readTime: 3,
    excerpt:
      'Thirty-six strangers, one image, and a shared instinct to make something together.',
    tag: 'Milestone',
  },
  {
    slug: 'how-it-works',
    title: 'How Community works',
    date: '2026-03-01',
    readTime: 2,
    excerpt:
      'Every day a new photo is split into a grid. You claim a tile, step outside, and photograph what you see.',
    tag: 'Guide',
  },
  {
    slug: 'why-we-built-this',
    title: 'Why we built this',
    date: '2026-02-20',
    readTime: 4,
    excerpt:
      "A small team, a big question: can strangers collaboratively see the world through each other's eyes?",
    tag: 'Story',
  },
]

export function BlogList() {
  const { t } = useTranslation()

  return (
    <div className="min-h-svh px-4 pb-20 sm:px-6">
      <AppNav />
      <div className="mx-auto mt-8 max-w-xl space-y-10 sm:mt-10">
        <header className="border-foreground border-b pb-6">
          <h1 className="text-foreground text-4xl font-black tracking-tight uppercase">
            {t('blog.title')}
          </h1>
          <p className="text-muted-foreground mt-2 text-xs tracking-[0.2em] uppercase">
            {t('blog.subtitle')}
          </p>
        </header>

        <div className="border-foreground border">
          {MOCK_POSTS.map((post, i) => (
            <article
              key={post.slug}
              className={`group hover:bg-foreground hover:text-background cursor-pointer p-6 transition-colors ${
                i < MOCK_POSTS.length - 1 ? 'border-foreground/20 border-b' : ''
              }`}
            >
              <p className="text-muted-foreground group-hover:text-background/70 mb-3 text-[10px] font-bold tracking-[0.2em] uppercase">
                {post.tag}
              </p>

              <h2 className="text-foreground group-hover:text-background mb-3 text-xl leading-tight font-black tracking-tight uppercase">
                {post.title}
              </h2>

              <p className="text-muted-foreground group-hover:text-background/80 mb-4 text-sm leading-relaxed">
                {post.excerpt}
              </p>

              <div className="text-muted-foreground group-hover:text-background/70 flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase">
                <span>
                  {new Date(post.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span>·</span>
                <span>{t('blog.min_read', { count: post.readTime })}</span>
              </div>
            </article>
          ))}
        </div>

        <p className="text-muted-foreground text-center text-[10px] tracking-[0.2em] uppercase">
          {t('blog.coming_soon')}
        </p>
      </div>
    </div>
  )
}
