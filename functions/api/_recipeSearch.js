// 楽天レシピAPIで実在レシピを引けなかったときの代わり。
//
// 料理名のWeb検索ページへ繋ぐ。特定のレシピを指せないぶん精度は落ちるが、
// 「レシピが見つかりませんでした」で行き止まりにするよりは先へ進める。
//
// 純関数なのでテストから直接呼べる。

const SEARCH_ENDPOINT = 'https://www.google.com/search';

const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';

export function webSearchLink(name) {
  if (!isFilledString(name)) return null;

  const dish = name.trim();
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('q', `${dish} レシピ`);

  // 楽天レシピと同じ形で返す。表示側に分岐を増やさないため。
  return {
    title: `「${dish}」のレシピを検索`,
    url: url.toString(),
    imageUrl: '',
    materials: [],
    indication: '',
    cost: '',
    source: 'search',
  };
}
