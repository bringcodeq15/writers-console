export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchWeb(
  apiKey: string,
  query: string,
  provider: string = 'brave'
): Promise<SearchResult[]> {
  if (provider === 'brave') {
    return searchBrave(apiKey, query);
  }
  throw new Error(`Unknown search provider: ${provider}`);
}

async function searchBrave(apiKey: string, query: string): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status}`);
  }

  const data = await response.json();
  const results: SearchResult[] = (data.web?.results || []).map(
    (r: { title: string; url: string; description: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    })
  );

  return results;
}
