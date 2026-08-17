"use client";

import { useState } from "react";
import { AlphaLogo, AlphaMarkImage } from "./alpha-logo";
import { ProgressBar } from "./progress-bar";
import { ScaleInput } from "./scale-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerAction } from "@/hooks/use-server-action";
import { submeterNpsResposta } from "@/lib/actions/nps";

type Step = "intro" | "nps" | "csat" | "cev" | "ces" | "closing" | "done";

type FormValues = {
  nomeEmpresa: string;
  whatsapp: string;
  nps: number | null;
  csatAtendimento: number | null;
  csatResultado: number | null;
  csatEntregas: number | null;
  cevSeguranca: number | null;
  cevValorizacao: number | null;
  cesFacilidade: number | null;
  perguntaFinal: string;
};

const INITIAL_VALUES: FormValues = {
  nomeEmpresa: "",
  whatsapp: "",
  nps: null,
  csatAtendimento: null,
  csatResultado: null,
  csatEntregas: null,
  cevSeguranca: null,
  cevValorizacao: null,
  cesFacilidade: null,
  perguntaFinal: "",
};

const STEP_INDEX: Record<Step, number> = {
  intro: 0,
  nps: 1,
  csat: 2,
  cev: 3,
  ces: 4,
  closing: 5,
  done: 5,
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-sm sm:p-8">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F5A100]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#F5A100]">
      {children}
    </span>
  );
}

function OpenQuestion({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-5">
      <label className="mb-2 block text-sm text-neutral-400">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-100 outline-none placeholder:text-neutral-400 focus:border-[#F5A100] focus:bg-neutral-800 focus:ring-2 focus:ring-[#F5A100]/20"
      />
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continuar",
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-7 flex items-center justify-between gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-neutral-200"
        >
          Voltar
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-full bg-[#F5A100] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#DE9200] disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
      >
        {nextLabel}
      </button>
    </div>
  );
}

export function NpsForm({ franquiaId, franquiaNome }: { franquiaId: string; franquiaNome: string }) {
  const [step, setStep] = useState<Step>("intro");
  const [data, setData] = useState<FormValues>(INITIAL_VALUES);
  const { pending, submit } = useServerAction(submeterNpsResposta.bind(null, franquiaId), () =>
    setStep("done"),
  );

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const progress = (STEP_INDEX[step] / 5) * 100;

  function handleEnviar() {
    const formData = new FormData();
    formData.set("nomeEmpresa", data.nomeEmpresa);
    formData.set("whatsapp", data.whatsapp);
    formData.set("nps", String(data.nps));
    formData.set("csatAtendimento", String(data.csatAtendimento));
    formData.set("csatResultado", String(data.csatResultado));
    formData.set("csatEntregas", String(data.csatEntregas));
    formData.set("cevSeguranca", String(data.cevSeguranca));
    formData.set("cevValorizacao", String(data.cevValorizacao));
    formData.set("cesFacilidade", String(data.cesFacilidade));
    formData.set("perguntaFinal", data.perguntaFinal);
    submit(formData);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-950">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-4">
          <AlphaLogo />
        </div>
        {step !== "intro" && step !== "done" && (
          <div className="mx-auto w-full max-w-md px-4 pb-4">
            <ProgressBar percent={progress} />
            <p className="mt-1.5 text-xs text-neutral-400">Etapa {STEP_INDEX[step]} de 5</p>
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
        {step === "intro" && (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <AlphaMarkImage size={80} />
            <h1 className="mt-6 text-2xl font-bold text-white">O que você acha da {franquiaNome}?</h1>
            <p className="mt-3 max-w-xs text-sm text-neutral-400">
              Sua opinião ajuda a gente a melhorar o marketing do seu restaurante. Leva menos de 2
              minutos.
            </p>

            <div className="mt-8 w-full space-y-4 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="nomeEmpresa" className="text-neutral-300">
                  Nome da empresa
                </Label>
                <Input
                  id="nomeEmpresa"
                  value={data.nomeEmpresa}
                  onChange={(e) => set("nomeEmpresa", e.target.value)}
                  className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-500"
                  placeholder="Nome do seu restaurante/empresa"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-neutral-300">
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  value={data.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep("nps")}
              disabled={data.nomeEmpresa.trim().length === 0 || data.whatsapp.trim().length === 0}
              className="mt-8 w-full rounded-full bg-[#F5A100] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#DE9200] disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              Começar
            </button>
          </div>
        )}

        {step === "nps" && (
          <Card>
            <SectionLabel>Recomendação</SectionLabel>
            <h2 className="mt-3 text-lg font-semibold text-white">
              Em uma escala de 0 a 10, qual a probabilidade de você recomendar a Assessoria Alpha a
              outro empresário / dono de restaurante?
            </h2>
            <div className="mt-5">
              <ScaleInput
                value={data.nps}
                onChange={(v) => set("nps", v)}
                leftLabel="De forma alguma recomendaria"
                rightLabel="Com certeza recomendaria"
              />
            </div>
            <NavButtons
              onBack={() => setStep("intro")}
              onNext={() => setStep("csat")}
              nextDisabled={data.nps === null}
            />
          </Card>
        )}

        {step === "csat" && (
          <Card>
            <SectionLabel>Satisfação</SectionLabel>
            <h2 className="mt-3 text-lg font-semibold text-white">
              De 0 a 10, o quão satisfeito você está com o atendimento da Alpha (agilidade,
              cordialidade, disponibilidade e clareza da equipe)?
            </h2>
            <div className="mt-5">
              <ScaleInput
                value={data.csatAtendimento}
                onChange={(v) => set("csatAtendimento", v)}
                leftLabel="Totalmente insatisfeito"
                rightLabel="Totalmente satisfeito"
              />
            </div>

            <h2 className="mt-8 text-lg font-semibold text-white">
              De 0 a 10, o quão satisfeito você está com os resultados que a Alpha vem entregando
              para você?
            </h2>
            <div className="mt-5">
              <ScaleInput
                value={data.csatResultado}
                onChange={(v) => set("csatResultado", v)}
                leftLabel="Totalmente insatisfeito"
                rightLabel="Totalmente satisfeito"
              />
            </div>

            <h2 className="mt-8 text-lg font-semibold text-white">
              De 0 a 10, o quão satisfeito você está com as entregas da Alpha (relatórios, ideias,
              estratégias e qualidade dos materiais)?
            </h2>
            <div className="mt-5">
              <ScaleInput
                value={data.csatEntregas}
                onChange={(v) => set("csatEntregas", v)}
                leftLabel="Totalmente insatisfeito"
                rightLabel="Totalmente satisfeito"
              />
            </div>

            <NavButtons
              onBack={() => setStep("nps")}
              onNext={() => setStep("cev")}
              nextDisabled={
                data.csatAtendimento === null || data.csatResultado === null || data.csatEntregas === null
              }
            />
          </Card>
        )}

        {step === "cev" && (
          <Card>
            <SectionLabel>Valor emocional</SectionLabel>
            <h2 className="mt-3 text-lg font-semibold text-white">
              De 0 a 10, o quanto você se sente seguro e tranquilo por ter a Alpha cuidando do
              marketing da sua empresa?
            </h2>
            <div className="mt-5">
              <ScaleInput
                value={data.cevSeguranca}
                onChange={(v) => set("cevSeguranca", v)}
                leftLabel="Nada"
                rightLabel="Totalmente"
              />
            </div>

            <h2 className="mt-8 text-lg font-semibold text-white">
              De 0 a 10, o quanto você se sente valorizado e bem cuidado como cliente da Alpha?
            </h2>
            <div className="mt-5">
              <ScaleInput
                value={data.cevValorizacao}
                onChange={(v) => set("cevValorizacao", v)}
                leftLabel="Nada"
                rightLabel="Totalmente"
              />
            </div>

            <NavButtons
              onBack={() => setStep("csat")}
              onNext={() => setStep("ces")}
              nextDisabled={data.cevSeguranca === null || data.cevValorizacao === null}
            />
          </Card>
        )}

        {step === "ces" && (
          <Card>
            <SectionLabel>Esforço</SectionLabel>
            <h2 className="mt-3 text-lg font-semibold text-white">
              De 0 a 10, quando se tem algum problema, o quão fácil é resolver com a Alpha?
            </h2>
            <div className="mt-5">
              <ScaleInput
                value={data.cesFacilidade}
                onChange={(v) => set("cesFacilidade", v)}
                leftLabel="Muito difícil, precisei insistir muito"
                rightLabel="Muito fácil, resolvido sem esforço"
              />
            </div>
            <NavButtons
              onBack={() => setStep("cev")}
              onNext={() => setStep("closing")}
              nextDisabled={data.cesFacilidade === null}
            />
          </Card>
        )}

        {step === "closing" && (
          <Card>
            <SectionLabel>Para fechar</SectionLabel>
            <h2 className="mt-3 text-lg font-semibold text-white">
              Se você fosse um dos donos da Assessoria Alpha, o que você faria de diferente se
              estivesse na gestão da equipe que gerencia sua empresa?
            </h2>
            <OpenQuestion
              label="Sua resposta (opcional)"
              value={data.perguntaFinal}
              onChange={(v) => set("perguntaFinal", v)}
              placeholder="Escreva aqui..."
            />
            <NavButtons
              onBack={() => setStep("ces")}
              onNext={handleEnviar}
              nextDisabled={pending}
              nextLabel={pending ? "Enviando..." : "Enviar"}
            />
          </Card>
        )}

        {step === "done" && (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <AlphaMarkImage size={80} />
            <h1 className="mt-6 text-2xl font-bold text-white">Muito obrigado!</h1>
            <p className="mt-3 max-w-xs text-sm text-neutral-400">
              Sua resposta foi registrada. Ela nos ajuda a melhorar o trabalho que fazemos pelo seu
              restaurante todos os dias.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
