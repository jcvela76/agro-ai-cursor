"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LANDING_AGENT_CHAR_MS,
  LANDING_AGENT_HOLD_MS,
  LANDING_AGENT_SCENARIO_GAP_MS,
  LANDING_AGENT_SCENARIOS,
  LANDING_AGENT_TOOL_DELAY_MS,
  LANDING_AGENT_USER_DELAY_MS,
  findLandingAgentScenario,
  nextLandingAgentScenarioId,
} from "@/content/landing/agent-demo";
import { LANDING_DEMO_PARCEL_NAME } from "@/content/landing/spectral-demo";
import {
  AgentChatView,
  type AgentChatViewMessage,
} from "@/ui/agent-chat/agent-chat-view";
import viewStyles from "@/ui/agent-chat/agent-chat-view.module.css";
import styles from "./landing-agent-demo.module.css";

type Phase = "idle" | "user" | "tool" | "assistant" | "hold";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function LandingAgentDemo() {
  const [scenarioId, setScenarioId] = useState(LANDING_AGENT_SCENARIOS[0].id);
  const [phase, setPhase] = useState<Phase>("idle");
  const [visibleChars, setVisibleChars] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);
  const startedRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  const paused = hoverPaused || manualPaused;

  const scenario =
    findLandingAgentScenario(scenarioId) ?? LANDING_AGENT_SCENARIOS[0];
  const assistantText = scenario.assistantMarkdown;

  const isRunActive = useCallback((runId: number) => runIdRef.current === runId, []);

  const playScenario = useCallback(
    (id: string) => {
      const nextScenario = findLandingAgentScenario(id) ?? LANDING_AGENT_SCENARIOS[0];
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setScenarioId(nextScenario.id);
      setPhase("idle");
      setVisibleChars(0);

      const sleep = (ms: number) =>
        new Promise<boolean>((resolve) => {
          window.setTimeout(() => resolve(isRunActive(runId)), ms);
        });

      void (async () => {
        if (!(await sleep(LANDING_AGENT_USER_DELAY_MS))) return;
        setPhase("user");

        if (!(await sleep(LANDING_AGENT_TOOL_DELAY_MS))) return;
        setPhase("tool");

        if (!(await sleep(reducedMotion ? 200 : 500))) return;
        setPhase("assistant");

        if (reducedMotion) {
          setVisibleChars(nextScenario.assistantMarkdown.length);
        } else {
          for (let index = 1; index <= nextScenario.assistantMarkdown.length; index += 1) {
            if (!isRunActive(runId)) return;
            setVisibleChars(index);
            if (!(await sleep(LANDING_AGENT_CHAR_MS))) return;
          }
        }

        if (!isRunActive(runId)) return;
        setPhase("hold");
      })();
    },
    [isRunActive, reducedMotion],
  );

  const cancelRun = useCallback(() => {
    runIdRef.current += 1;
  }, []);

  const startOrResume = useCallback(() => {
    if (paused || !inView) return;
    cancelRun();
    playScenario(scenarioId);
  }, [cancelRun, inView, paused, playScenario, scenarioId]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry?.isIntersecting ?? false);
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) {
      startedRef.current = false;
      cancelRun();
      setPhase("idle");
      setVisibleChars(0);
      return;
    }
    if (paused || startedRef.current) return;
    startedRef.current = true;
    playScenario(scenarioId);
  }, [cancelRun, inView, paused, playScenario, scenarioId]);

  useEffect(() => {
    if (!inView || paused || phase !== "hold") return;
    const timer = window.setTimeout(() => {
      cancelRun();
      playScenario(nextLandingAgentScenarioId(scenarioId));
    }, LANDING_AGENT_HOLD_MS + LANDING_AGENT_SCENARIO_GAP_MS);
    return () => window.clearTimeout(timer);
  }, [cancelRun, inView, paused, phase, playScenario, scenarioId]);

  const onChipClick = (id: string) => {
    setManualPaused(false);
    setScenarioId(id);
    startedRef.current = true;
    cancelRun();
    playScenario(id);
  };

  const viewMessages = useMemo((): AgentChatViewMessage[] => {
    if (phase === "idle") return [];

    const items: AgentChatViewMessage[] = [
      {
        id: `${scenarioId}-user`,
        role: "user",
        text: scenario.userQuestion,
      },
    ];

    if (phase === "tool" || phase === "assistant" || phase === "hold") {
      const streamedMarkdown = assistantText.slice(0, visibleChars);
      items.push({
        id: `${scenarioId}-assistant`,
        role: "assistant",
        text: phase === "tool" ? "" : streamedMarkdown,
        toolNote: scenario.toolNote,
        showToolNoteWithText: phase === "tool",
        streaming: phase === "assistant" && visibleChars < assistantText.length,
      });
    }

    return items;
  }, [assistantText, phase, scenario.userQuestion, scenario.toolNote, scenarioId, visibleChars]);

  const suggestions = LANDING_AGENT_SCENARIOS.map((item) => ({
    id: item.id,
    label: item.chipLabel,
    prompt: item.userQuestion,
    active: item.id === scenarioId,
  }));

  return (
    <div
      ref={rootRef}
      className={styles.panel}
      onMouseEnter={() => {
        setHoverPaused(true);
        cancelRun();
      }}
      onMouseLeave={() => {
        setHoverPaused(false);
        if (inView && phase === "hold" && !manualPaused) {
          startOrResume();
        }
      }}
    >
      <AgentChatView
        parcelName={LANDING_DEMO_PARCEL_NAME}
        retentionDays={7}
        messages={viewMessages}
        messagesClassName={styles.messagesTall}
        messagesMaxHeight="28rem"
        suggestions={suggestions}
        onSuggestionClick={(suggestion) => onChipClick(suggestion.id)}
        suggestionExtras={
          <button
            type="button"
            className={`${viewStyles.suggestionChip} ${styles.pauseChip}`}
            onClick={() => {
              setManualPaused((value) => {
                const next = !value;
                if (next) {
                  cancelRun();
                } else if (inView) {
                  startedRef.current = true;
                  playScenario(scenarioId);
                }
                return next;
              });
            }}
            aria-pressed={manualPaused}
          >
            {manualPaused ? "Reanudar demo" : "Pausar"}
          </button>
        }
        emptyState={false}
        footer={<p className={styles.disclaimer}>Demo ilustrativa · no en tiempo real</p>}
        composer={
          <div className={styles.composerMock} aria-hidden>
            <p className={styles.inputMock}>Escribe tu pregunta…</p>
            <span className={styles.sendMock}>Enviar</span>
          </div>
        }
      />
    </div>
  );
}
