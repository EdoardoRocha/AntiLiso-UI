'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useCreateLearningRule,
  useDeleteCategory,
  useDeleteLearningRule,
  useLearningRules,
  useUpdateCategory,
} from '@/hooks/use-categories';
import { ApiError } from '@/lib/api';
import { CATEGORY_TYPE_LABELS, formatCurrency } from '@/lib/format';
import type { CategoryType } from '@/types/api';

export default function CategoriesPage() {
  const [filterTipo, setFilterTipo] = useState<CategoryType | undefined>(undefined);
  const { data: categories = [], isLoading } = useCategories(filterTipo);
  const { data: allCategories = [] } = useCategories();
  const { data: learningRules = [], isLoading: rulesLoading } = useLearningRules();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const createRuleMutation = useCreateLearningRule();
  const deleteRuleMutation = useDeleteLearningRule();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<CategoryType>('DESPESA');
  const [ehEssencial, setEhEssencial] = useState(true);
  const [orcamentoMensal, setOrcamentoMensal] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const [ruleTerm, setRuleTerm] = useState('');
  const [ruleCategoryId, setRuleCategoryId] = useState('');
  const [ruleFeedback, setRuleFeedback] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    let parsedBudget: number | null = null;
    if (orcamentoMensal.trim()) {
      const value = Number(orcamentoMensal.replace(',', '.'));
      if (Number.isNaN(value) || value < 0) {
        setFeedback('Orçamento mensal inválido.');
        return;
      }
      parsedBudget = Number(value.toFixed(2));
    }

    try {
      await createMutation.mutateAsync({
        nome,
        tipo,
        ehEssencial: tipo === 'RECEITA' ? false : ehEssencial,
        orcamentoMensal: parsedBudget,
      });
      setNome('');
      setOrcamentoMensal('');
    } catch (error) {
      setFeedback(error instanceof ApiError ? error.message : 'Erro ao criar categoria.');
    }
  }

  async function handleToggleEssential(id: string, current: boolean) {
    setFeedback(null);
    try {
      await updateMutation.mutateAsync({ id, payload: { ehEssencial: !current } });
    } catch (error) {
      setFeedback(error instanceof ApiError ? error.message : 'Erro ao atualizar categoria.');
    }
  }

  async function handleDelete(id: string) {
    setFeedback(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      setFeedback(error instanceof ApiError ? error.message : 'Erro ao remover categoria.');
    }
  }

  async function handleCreateRule(event: FormEvent) {
    event.preventDefault();
    setRuleFeedback(null);
    const targetCategoryId = ruleCategoryId || allCategories[0]?.id || '';
    if (!targetCategoryId) {
      setRuleFeedback('Selecione uma categoria válida.');
      return;
    }

    try {
      await createRuleMutation.mutateAsync({
        termoChave: ruleTerm,
        categoriaId: targetCategoryId,
      });
      setRuleTerm('');
    } catch (error) {
      setRuleFeedback(
        error instanceof ApiError ? error.message : 'Erro ao salvar regra de aprendizado.',
      );
    }
  }

  async function handleDeleteRule(id: string) {
    setRuleFeedback(null);
    try {
      await deleteRuleMutation.mutateAsync(id);
    } catch (error) {
      setRuleFeedback(
        error instanceof ApiError ? error.message : 'Erro ao remover regra de aprendizado.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Categorias</h1>
        <p className="text-sm text-zinc-400">
          Organize entradas (<span className="text-emerald-400">Entrou</span>) e saídas (
          <span className="text-rose-400">Saiu</span>) marcando gastos essenciais para a reserva.
        </p>
      </header>

      <div className="flex gap-2">
        {(
          [
            { label: 'Todas', value: undefined },
            { label: 'Saiu', value: 'DESPESA' },
            { label: 'Entrou', value: 'RECEITA' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setFilterTipo(tab.value)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              filterTipo === tab.value
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
          {feedback}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2.5 lg:col-span-2">
          {isLoading ? (
            <p className="text-sm text-zinc-400">Carregando categorias...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhuma categoria encontrada.</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{category.nome}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        category.tipo === 'RECEITA'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {CATEGORY_TYPE_LABELS[category.tipo]}
                    </span>
                    {category.ehEssencial && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        Essencial
                      </span>
                    )}
                  </div>
                  {category.orcamentoMensal !== null && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Orçamento mensal: {formatCurrency(category.orcamentoMensal)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {category.tipo === 'DESPESA' && (
                    <button
                      type="button"
                      onClick={() => void handleToggleEssential(category.id, category.ehEssencial)}
                      disabled={updateMutation.isPending}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                    >
                      {category.ehEssencial ? 'Remover essencial' : 'Marcar essencial'}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Excluir ${category.nome}`}
                    onClick={() => void handleDelete(category.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:border-rose-500/40 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={(e) => void handleCreate(e)}
          className="h-fit space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">Nova Categoria</h2>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">Nome</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Mercado, Freelance"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">Fluxo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as CategoryType)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="DESPESA">Saiu (Despesa)</option>
              <option value="RECEITA">Entrou (Receita)</option>
            </select>
          </div>

          {tipo === 'DESPESA' && (
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={ehEssencial}
                onChange={(e) => setEhEssencial(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-950"
              />
              Compõe o custo de vida essencial
            </label>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Orçamento mensal (opcional)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={orcamentoMensal}
              onChange={(e) => setOrcamentoMensal(e.target.value)}
              placeholder="Ex: 800.00"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Criando...' : 'Criar Categoria'}
          </button>
        </form>
      </div>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                Regras Aprendidas (Categorização Inteligente)
              </h2>
              <p className="text-xs text-zinc-400">
                Associações aprendidas automaticamente pelos seus lançamentos para o Quick-Add.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => void handleCreateRule(e)} className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            required
            minLength={2}
            value={ruleTerm}
            onChange={(e) => setRuleTerm(e.target.value)}
            placeholder="Palavra-chave (ex: uber, ifood)"
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
          <select
            value={ruleCategoryId || allCategories[0]?.id || ''}
            onChange={(e) => setRuleCategoryId(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            {allCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome} ({CATEGORY_TYPE_LABELS[cat.tipo]})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createRuleMutation.isPending || allCategories.length === 0}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {createRuleMutation.isPending ? 'Salvando...' : 'Ensinar Regra'}
          </button>
        </form>

        {ruleFeedback && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {ruleFeedback}
          </p>
        )}

        {rulesLoading ? (
          <p className="text-sm text-zinc-400">Carregando regras...</p>
        ) : learningRules.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Nenhuma regra aprendida ainda. Categorize um lançamento no Quick-Add ou no Extrato para
            começar.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {learningRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2.5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-emerald-300">
                      {rule.termoChave}
                    </code>
                    <span className="text-xs text-zinc-400">→</span>
                    <span className="text-xs font-medium text-zinc-100">{rule.categoriaNome}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {CATEGORY_TYPE_LABELS[rule.categoriaTipo]} • {rule.hitsConfianca}x confiança
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remover regra ${rule.termoChave}`}
                  onClick={() => void handleDeleteRule(rule.id)}
                  disabled={deleteRuleMutation.isPending}
                  className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:border-rose-500/40 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
