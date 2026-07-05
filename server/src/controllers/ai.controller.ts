import { Response } from 'express';
import { z } from 'zod';
import { HfInference } from '@huggingface/inference';
import { AuthRequest } from '../middleware/auth.middleware';

const generateSchema = z.object({
  type: z.enum(['fiche_cours', 'exercices', 'quiz', 'corrige', 'bilan']),
  context: z.object({
    titre: z.string().optional(),
    matiere: z.string().optional(),
    niveau: z.string().optional(),
    objectifs: z.string().optional(),
    contenu: z.string().optional(),
    nombreQuestions: z.number().optional(),
    enonce: z.string().optional(),
    notes: z.array(z.object({ nom: z.string(), note: z.number(), bareme: z.number() })).optional(),
    absences: z.number().optional(),
  }),
});

const buildPrompt = (type: string, ctx: Record<string, unknown>): string => {
  const prompts: Record<string, string> = {
    fiche_cours: `Tu es un expert pédagogique. Génère une fiche de cours complète et structurée en français.
Titre: ${ctx.titre || ''}
Matière: ${ctx.matiere || ''}
Niveau: ${ctx.niveau || ''}
Objectifs: ${ctx.objectifs || ''}
La fiche doit inclure: Introduction, Prérequis, Contenu détaillé avec exemples, Activités pratiques, Résumé, Références.
Réponds uniquement avec la fiche en Markdown.`,

    exercices: `Tu es un professeur expert. Génère 3 séries d'exercices différenciés (facile, moyen, difficile) en français.
Matière: ${ctx.matiere || ''}
Niveau: ${ctx.niveau || ''}
Sujet: ${ctx.titre || ''}
Inclus les consignes claires et laisse de l'espace pour les réponses.
Réponds uniquement avec les exercices en Markdown.`,

    quiz: `Tu es un professeur. Génère un QCM de ${ctx.nombreQuestions || 5} questions en français.
Matière: ${ctx.matiere || ''}
Niveau: ${ctx.niveau || ''}
Sujet: ${ctx.titre || ''}
Chaque question doit avoir 4 options (A, B, C, D). Inclus les bonnes réponses à la fin.
Réponds uniquement avec le quiz en Markdown.`,

    corrige: `Tu es un professeur. Génère un corrigé détaillé pour l'énoncé suivant.
Matière: ${ctx.matiere || ''}
Niveau: ${ctx.niveau || ''}
Énoncé: ${ctx.enonce || ''}
Inclus les étapes de résolution et les justifications.
Réponds uniquement avec le corrigé en Markdown.`,

    bilan: `Tu es un conseiller pédagogique. Génère un bilan de progression individualisé pour un élève.
Matière: ${ctx.matiere || ''}
Niveau: ${ctx.niveau || ''}
Notes: ${JSON.stringify(ctx.notes || [])}
Absences: ${ctx.absences || 0}
Le bilan doit inclure: Points forts, Points à améliorer, Objectifs à court terme, Recommandations personnalisées.
Réponds uniquement avec le bilan en Markdown.`,
  };
  return prompts[type] || '';
};

export const generateContent = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }

  const { type, context } = parsed.data;
  const prompt = buildPrompt(type, context as Record<string, unknown>);

  try {
    const hf = new HfInference(process.env.HF_TOKEN);
    const model = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';

    const result = await hf.textGeneration({
      model,
      inputs: `<s>[INST] ${prompt} [/INST]`,
      parameters: { max_new_tokens: 1500, temperature: 0.7, return_full_text: false },
    });

    res.json({ content: result.generated_text });
  } catch (err) {
    console.error('HuggingFace API error:', err);
    res.status(502).json({ message: "Erreur lors de la génération IA. Vérifiez votre HF_TOKEN." });
  }
};
