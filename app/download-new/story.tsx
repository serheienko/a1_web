// app/download-new/story.tsx
//
// Всё, что идёт ниже первого экрана: полоса живых цифр, три шага с «телефонами»
// и финальный призыв. Серверный компонент (текст остаётся в HTML для поисковиков);
// оживляют его два маленьких клиентских: ./live-number.tsx (цифры) и
// ./story-controller.tsx (появление по прокрутке).
import type { ReactNode } from "react";
import { LiveNumber } from "./live-number";
import { StoryController } from "./story-controller";
import { LocN } from "./locn";
import n from "./download-new.module.css";

const STORY_ID = "how";

function CheckIcon() {
  return (
    <svg className={n.checkSvg} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M13 25l8 8 15-17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className={n.phone} aria-hidden="true">
      <span className={n.notch} />
      <div className={n.screen}>{children}</div>
    </div>
  );
}

const JOBS = [
  { title: "Senior React Developer", meta: "Remote · EU", tags: ["React", "TypeScript"], pay: "$4–5k" },
  { title: "Product Designer", meta: "Hybrid · Berlin", tags: ["Figma", "UX"], pay: "€4k" },
  { title: "Data Analyst", meta: "Remote · Worldwide", tags: ["SQL", "Python"], pay: "$3k" },
];

export function Story({ cta }: { cta: ReactNode }) {
  return (
    <div className={n.below}>
      {/* полоса живых цифр: те же числа, что и в первом экране, плюс компании и страны */}
      <section className={n.band} aria-label="A1">
        <div className={n.inner}>
          <p className={n.bandTag}>
            <span className={n.liveDot} aria-hidden="true" />
            LIVE
          </p>
          <div className={n.stats}>
            <div className={n.stat}>
              <LiveNumber field="jobs" className={n.statNum} />
              <span className={n.statLabel}>
                <LocN render={(c) => c.statJobs} inline />
              </span>
            </div>
            <div className={n.stat}>
              <LiveNumber field="companies" className={n.statNum} />
              <span className={n.statLabel}>
                <LocN render={(c) => c.statCompanies} inline />
              </span>
            </div>
            <div className={n.stat}>
              <LiveNumber field="countries" className={n.statNum} />
              <span className={n.statLabel}>
                <LocN render={(c) => c.statCountries} inline />
              </span>
            </div>
            <div className={n.stat}>
              <LiveNumber field="today" className={n.statNum} prefix="+" />
              <span className={n.statLabel}>
                <LocN render={(c) => c.statToday} inline />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id={STORY_ID} className={n.story}>
        <StoryController targetId={STORY_ID} />
        <div className={n.inner}>
          <p className={n.eyebrow} data-reveal="">
            <LocN render={(c) => c.storyEyebrow} inline />
          </p>
          <h2 className={n.title} data-reveal="">
            <LocN render={(c) => c.storyTitle} />
          </h2>

          <div className={n.steps}>
            <div className={n.rail} aria-hidden="true">
              <span className={n.railFill} />
            </div>

            {/* 1. Найдите */}
            <article className={n.step} data-reveal="">
              <div className={n.stepText}>
                <span className={n.num}>01</span>
                <h3 className={n.stepTitle}>
                  <LocN render={(c) => c.s1Title} />
                </h3>
                <p>
                  <LocN render={(c) => c.s1Text} />
                </p>
              </div>
              <div className={n.phoneCol}>
                <Phone>
                  <div className={n.search}>
                    <i className={n.searchIcon} />
                    <i className={n.searchLine} />
                  </div>
                  {JOBS.map((j, i) => (
                    <div key={j.title} className={n.job} style={{ ["--i" as string]: i }}>
                      <span className={n.jobTitle}>{j.title}</span>
                      <span className={n.jobMeta}>{j.meta}</span>
                      <span className={n.tags}>
                        {j.tags.map((t) => (
                          <span key={t} className={n.tag}>
                            {t}
                          </span>
                        ))}
                        <span className={`${n.tag} ${n.pay}`}>{j.pay}</span>
                      </span>
                    </div>
                  ))}
                </Phone>
              </div>
            </article>

            {/* 2. Напишите напрямую */}
            <article className={`${n.step} ${n.reverse}`} data-reveal="">
              <div className={n.stepText}>
                <span className={n.num}>02</span>
                <h3 className={n.stepTitle}>
                  <LocN render={(c) => c.s2Title} />
                </h3>
                <p>
                  <LocN render={(c) => c.s2Text} />
                </p>
              </div>
              <div className={n.phoneCol}>
                <Phone>
                  <div className={n.chat}>
                    <div className={`${n.bubble} ${n.bIn}`} style={{ ["--i" as string]: 0 }}>
                      <LocN render={(c) => c.chatIn} />
                    </div>
                    <div className={`${n.bubble} ${n.bOut}`} style={{ ["--i" as string]: 1 }}>
                      <LocN render={(c) => c.chatOut} />
                    </div>
                    <div className={n.slot}>
                      <div className={`${n.bubble} ${n.bIn} ${n.typing}`}>
                        <i />
                        <i />
                        <i />
                      </div>
                      <div className={`${n.bubble} ${n.bIn} ${n.last}`}>
                        <LocN render={(c) => c.chatIn2} />
                      </div>
                    </div>
                  </div>
                </Phone>
              </div>
            </article>

            {/* 3. Оффер */}
            <article className={n.step} data-reveal="">
              <div className={n.stepText}>
                <span className={n.num}>03</span>
                <h3 className={n.stepTitle}>
                  <LocN render={(c) => c.s3Title} />
                </h3>
                <p>
                  <LocN render={(c) => c.s3Text} />
                </p>
              </div>
              <div className={n.phoneCol}>
                <Phone>
                  <div className={n.offer}>
                    <div className={n.checkWrap}>
                      <span className={n.ring} />
                      <span className={`${n.ring} ${n.ring2}`} />
                      <span className={n.check}>
                        <CheckIcon />
                      </span>
                      {Array.from({ length: 14 }, (_, i) => (
                        <span
                          key={i}
                          className={n.conf}
                          style={{ ["--a" as string]: `${i * (360 / 14)}deg`, ["--d" as string]: `${64 + (i % 3) * 14}px`, ["--k" as string]: i }}
                        />
                      ))}
                    </div>
                    <span className={n.offerBadge}>
                      <LocN render={(c) => c.offerBadge} />
                    </span>
                    <span className={n.offerRole}>Senior React Developer · Remote</span>
                  </div>
                </Phone>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={n.cta}>
        <div className={n.inner}>
          <h2 className={n.ctaTitle} data-reveal="">
            <LocN render={(c) => c.ctaTitle} />
          </h2>
          <p className={n.ctaText} data-reveal="">
            <LocN render={(c) => c.ctaText} />
          </p>
          <div className={n.ctaButtons} data-reveal="">
            {cta}
          </div>
        </div>
      </section>
    </div>
  );
}
