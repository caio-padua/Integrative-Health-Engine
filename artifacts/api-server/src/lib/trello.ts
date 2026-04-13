const TRELLO_API_BASE = "https://api.trello.com/1";

export function getTrelloCredentials(): { apiKey: string; token: string } | null {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!apiKey || !token) return null;
  return { apiKey, token };
}

export function isTrelloConfigured(): boolean {
  return getTrelloCredentials() !== null;
}

async function trelloFetch(path: string, options: RequestInit = {}): Promise<any> {
  const creds = getTrelloCredentials();
  if (!creds) throw new Error("Trello nao configurado. Defina TRELLO_API_KEY e TRELLO_TOKEN.");

  const separator = path.includes("?") ? "&" : "?";
  const url = `${TRELLO_API_BASE}${path}${separator}key=${creds.apiKey}&token=${creds.token}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function createTrelloCard(listId: string, name: string, desc: string, labels?: string[]): Promise<any> {
  return trelloFetch("/cards", {
    method: "POST",
    body: JSON.stringify({
      idList: listId,
      name,
      desc,
      ...(labels && labels.length > 0 ? { idLabels: labels.join(",") } : {}),
    }),
  });
}

export async function updateTrelloCard(cardId: string, updates: { name?: string; desc?: string; idList?: string; closed?: boolean }): Promise<any> {
  return trelloFetch(`/cards/${cardId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteTrelloCard(cardId: string): Promise<void> {
  await trelloFetch(`/cards/${cardId}`, { method: "DELETE" });
}

export async function getTrelloBoard(boardId: string): Promise<any> {
  return trelloFetch(`/boards/${boardId}?lists=all&cards=all`);
}

export async function getTrelloBoardLists(boardId: string): Promise<any[]> {
  return trelloFetch(`/boards/${boardId}/lists`);
}

export async function getTrelloListCards(listId: string): Promise<any[]> {
  return trelloFetch(`/lists/${listId}/cards`);
}

export async function moveTrelloCard(cardId: string, listId: string): Promise<any> {
  return trelloFetch(`/cards/${cardId}`, {
    method: "PUT",
    body: JSON.stringify({ idList: listId }),
  });
}

export const TRELLO_STATUS_MAP: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluido",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};
