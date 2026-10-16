window.SCENARIO=(function(){
  var agents=[
    {id:'a1', n:'Agente 1', role:'detecção', uses:['rev','geo'], l:[
      [0.3,'hyp',null,'Hipótese: a prateleira ficou vazia em parte das lojas'],
      [0.6,'conn','rev','revIQ · transactions.nf_items'],
      [0.9,'sql','rev','<k>SELECT</k> store_id, dt, SUM(<k>IF</k>(brand=<s>\'marca\'</s>, qty, 0)) marca, SUM(qty) cat\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> category = <s>\'cerveja\'</s> <k>AND</k> dt >= <s>\'2026-06-01\'</s>\n<k>GROUP BY</k> 1, 2'],
      [2.0,'res','rev','298.400 linhas · 9.410.882 lidas · 5,2 s · 2,3 GB'],
      [2.5,'note',null,'Loja-dia com categoria vendendo e marca em zero: 41.200. Antes de junho a média era 9.800'],
      [2.9,'dead',null,'Zero em um dia pode ser acaso em loja pequena. Exigir 3 dias seguidos com categoria acima da média da loja'],
      [3.3,'sql','rev','<k>SELECT</k> store_id, MIN(dt) ini, MAX(dt) fim, COUNT(*) dias\n<k>FROM</k> gaps\n<k>WHERE</k> dias_seguidos >= 3 <k>AND</k> cat_dia > media_loja\n<k>GROUP BY</k> 1'],
      [4.3,'res','rev','2.140 linhas · 1,9 s'],
      [4.8,'conn','geo','geoIQ · places.pois'],
      [5.0,'sql','geo','<k>SELECT</k> p.chain, p.channel, COUNT(*) lojas\n<k>FROM</k> gaps g <k>JOIN</k> `places.pois` p <k>USING</k> (store_id) <k>GROUP BY</k> 1, 2'],
      [5.6,'res','geo','22 linhas · 0,8 s'],
      [6.1,'find',null,'2.140 lojas com ruptura de 3+ dias em junho. 1.410 são de duas redes de supermercado; o resto é autosserviço independente'],
      [6.5,'done',null,'Concluído']]},
    {id:'a2', n:'Agente 2', role:'quem absorveu', uses:['rev'], l:[
      [0.3,'hyp',null,'Hipótese: o comprador levou o concorrente nos dias de ruptura'],
      [0.6,'conn','rev','revIQ · transactions.nf_items'],
      [0.9,'sql','rev','<k>SELECT</k> brand, SUM(<k>IF</k>(in_gap, qty, 0)) gap, SUM(<k>IF NOT</k>(in_gap), qty, 0)) normal\n<k>FROM</k> `transactions.nf_items` n <k>JOIN</k> gap_days g <k>USING</k> (store_id, dt)\n<k>WHERE</k> category = <s>\'cerveja\'</s> <k>GROUP BY</k> 1'],
      [2.1,'res','rev','9 linhas · 9.410.882 lidas · 4,8 s · 2,3 GB'],
      [2.6,'note',null,'Nos dias de ruptura, marca C +34%, marca D +9%, demais estáveis. Categoria −6%'],
      [3.0,'dead',null,'Categoria caiu 6%: parte da venda não foi para ninguém. Separar substituição de perda'],
      [3.4,'sql','rev','<k>SELECT</k> SUM(cat_gap - cat_normal_esperada) perda_cat,\n  SUM(marca_normal_esperada) perda_marca\n<k>FROM</k> gap_expectation'],
      [4.3,'res','rev','1 linha · 2,0 s'],
      [4.8,'find',null,'Da venda esperada da marca nos dias de ruptura, 71% foi para C e D e 29% sumiu da loja. Em reais: R$ 4,1 mi substituídos, R$ 1,7 mi perdidos pela loja também'],
      [5.2,'done',null,'Concluído']]},
    {id:'a3', n:'Agente 3', role:'demanda não atendida', uses:['bid','geo'], l:[
      [0.3,'hyp',null,'Hipótese: o fluxo de loja não caiu, então a demanda estava lá'],
      [0.6,'conn','geo','geoIQ · places.visits'],
      [0.9,'sql','geo','<k>SELECT</k> store_id, dt, visits\n<k>FROM</k> `places.visits`\n<k>WHERE</k> store_id <k>IN</k> (<k>SELECT</k> store_id <k>FROM</k> gaps) <k>AND</k> dt >= <s>\'2026-05-15\'</s>'],
      [1.9,'res','geo','96.300 linhas · 1,6 s'],
      [2.4,'note',null,'Visitas nas lojas em ruptura: +2% contra as semanas anteriores. O fluxo não explica'],
      [2.8,'conn','bid','bidIQ · audiences.members'],
      [3.1,'sql','bid','<k>SELECT</k> COUNT(DISTINCT device) pessoas\n<k>FROM</k> `audiences.members` a <k>JOIN</k> `places.visits` v <k>USING</k> (device)\n<k>WHERE</k> a.audience = <s>\'compradores_marca_90d\'</s> <k>AND</k> v.store_id <k>IN</k> (<k>SELECT</k> store_id <k>FROM</k> gaps) <k>AND</k> v.dt <k>IN</k> gap_days'],
      [4.2,'res','bid','1 linha · 3.912.004 lidas · 3,1 s'],
      [4.7,'dead',null,'1,9 mi de compradores da marca visitaram lojas em ruptura. Mas visitar não é querer comprar cerveja naquele dia'],
      [5.1,'sql','bid','<k>SELECT</k> AVG(bought_cat) taxa\n<k>FROM</k> visit_outcomes\n<k>WHERE</k> audience = <s>\'compradores_marca_90d\'</s> <k>AND NOT</k> in_gap'],
      [5.8,'res','bid','1 linha · 0,9 s'],
      [6.3,'find',null,'Em dia normal, 38% dessas visitas levam cerveja da marca. Aplicando à ruptura: 720 mil ocasiões de compra sem produto'],
      [6.7,'done',null,'Concluído']]},
    {id:'a4', n:'Agente 4', role:'mídia desperdiçada', uses:['ad','geo'], l:[
      [0.3,'hyp',null,'Hipótese: a campanha rodou em praças onde não tinha produto'],
      [0.6,'conn','ad','adsIQ · performance.media'],
      [0.9,'sql','ad','<k>SELECT</k> geo_cell, dt, SUM(impressions) imp, SUM(spend) spend\n<k>FROM</k> `performance.media`\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> dt >= <s>\'2026-06-01\'</s> <k>GROUP BY</k> 1, 2'],
      [1.9,'res','ad','44.100 linhas · 1,4 s'],
      [2.3,'conn','geo','geoIQ · places.pois'],
      [2.6,'sql','geo','<k>SELECT</k> m.dt, SUM(m.spend) spend_em_ruptura\n<k>FROM</k> media m <k>JOIN</k> `places.pois` p <k>ON</k> p.geo_cell = m.geo_cell\n<k>JOIN</k> gap_days g <k>USING</k> (store_id, dt) <k>GROUP BY</k> 1'],
      [3.7,'res','geo','30 linhas · 2,4 s'],
      [4.2,'note',null,'R$ 610 mil de mídia entregues em células onde a loja mais próxima estava sem produto. 23% do investimento do mês'],
      [4.6,'dead',null,'Nem toda célula tem só uma loja. Contar só células onde 100% das lojas estavam em ruptura'],
      [5.0,'sql','geo','<k>SELECT</k> SUM(spend) <k>FROM</k> media_cells <k>WHERE</k> pct_lojas_em_ruptura = 1'],
      [5.6,'res','geo','1 linha · 1,0 s'],
      [6.1,'find',null,'R$ 380 mil (14% do mês) de mídia foram entregues onde não havia nenhuma loja com produto. O resto da sobreposição é parcial'],
      [6.5,'done',null,'Concluído']]},
    {id:'a5', n:'Agente 5', role:'recorrência', uses:['rev','geo'], l:[
      [0.3,'hyp',null,'Hipótese: a ruptura é estrutural em algumas redes, não um acidente de junho'],
      [0.6,'conn','rev','revIQ · transactions.nf_items'],
      [0.9,'sql','rev','<k>SELECT</k> p.chain, EXTRACT(MONTH <k>FROM</k> dt) m, COUNT(DISTINCT store_id) lojas_com_gap\n<k>FROM</k> gaps_12m g <k>JOIN</k> `places.pois` p <k>USING</k> (store_id)\n<k>GROUP BY</k> 1, 2'],
      [2.2,'res','rev','132 linhas · 11.880.400 lidas · 6,1 s · 2,9 GB'],
      [2.7,'note',null,'Rede A: ruptura em 8 dos 12 meses, sempre na última semana. Rede B: só em junho'],
      [3.1,'dead',null,'Rede A pode ter reposição mensal e não ruptura. Ver se a categoria também zera'],
      [3.5,'sql','rev','<k>SELECT</k> AVG(cat_qty) <k>FROM</k> gap_days <k>WHERE</k> chain = <s>\'A\'</s>'],
      [4.2,'res','rev','1 linha · 0,7 s'],
      [4.7,'note',null,'Categoria na rede A vende normal nos dias em que a marca zera. É ruptura, e é recorrente'],
      [5.3,'find',null,'Rede A tem ruptura recorrente de fim de mês (8 de 12 meses). Rede B foi pontual em junho. Independentes resolvem em 2 dias'],
      [5.7,'done',null,'Concluído']]}
  ];
  var orq={id:'orq', n:'Orquestrador', role:'', l:[
    [0.0,'note',null,'Pergunta recebida. Quebrando em 5 hipóteses: detecção, quem absorveu, demanda não atendida, mídia desperdiçada, recorrência'],
    [0.15,'note',null,'5 agentes disparados em paralelo, cada um com acesso às bases que precisa'],
    [7.5,'note',null,'Recebeu 5 conclusões. Perda da marca: R$ 5,8 mi (4,1 substituída + 1,7 sumiu). Demanda sem produto: 720 mil ocasiões. Mídia no vazio: R$ 380 mil','gather'],
    [8.1,'note',null,'As duas estimativas de perda vêm de caminhos diferentes (venda esperada vs. visitas × conversão). 720 mil ocasiões × ticket médio R$ 8,30 = R$ 6,0 mi. Bate com 5,8'],
    [8.8,'note',null,'Pedindo ao Agente 5 um teste: a rede A perde o mesmo todo mês?',['ask','a5']],
    [9.9,'note',null,'Agente 5: rede A perde entre R$ 1,1 e 1,4 mi por mês há 8 meses. É a maior parte do problema e é estrutural',['reply','a5']],
    [10.5,'note',null,'Reconciliado: perda de junho R$ 5,8 mi, confiança alta; rede A é recorrente (≈ R$ 1,2 mi/mês); R$ 380 mil de mídia no vazio. Enviando ao Auditor','audit'],
    [13.1,'conn','bid','search_audiences("compradores cerveja supermercado")'],
    [13.7,'res','bid','Compradores frequentes de cerveja · 11.200.000 pessoas · Visitantes de supermercados · 38.400.000 pessoas'],
    [14.3,'find',null,'Resposta pronta, auditada'],
    [14.5,'done',null,'Concluído']]};
  var aud={id:'aud', n:'Auditor', role:'', l:[
    [10.7,'hyp',null,'Recebeu só as conclusões e os números. Vai refazer a perda e a mídia no vazio'],
    [10.9,'conn','rev','revIQ · transactions.nf_items'],
    [11.1,'sql','rev','<k>SELECT</k> SUM(expected - actual) perda\n<k>FROM</k> (<k>SELECT</k> store_id, dt, actual, AVG(actual) <k>OVER</k> (PARTITION BY store_id, EXTRACT(DAYOFWEEK <k>FROM</k> dt)) expected\n  <k>FROM</k> daily_brand <k>WHERE</k> dt >= <s>\'2026-04-01\'</s>) <k>WHERE</k> in_gap'],
    [11.9,'res','rev','1 linha · 9.410.882 lidas · 4,9 s'],
    [12.1,'note',null,'Perda refeita por dia da semana: R$ 5,5 mi. Agente disse 5,8. Diferença de 5%, dentro da margem'],
    [12.3,'conn','geo','geoIQ · places.pois'],
    [12.5,'sql','geo','<k>SELECT</k> SUM(spend) <k>FROM</k> media_cells m\n<k>WHERE NOT EXISTS</k> (<k>SELECT</k> 1 <k>FROM</k> `places.pois` p <k>WHERE</k> p.geo_cell = m.geo_cell <k>AND</k> p.store_id <k>NOT IN</k> gaps)'],
    [12.8,'res','geo','1 linha · 1,1 s'],
    [12.9,'dead',null,'Ressalva: R$ 380 mil considera só lojas que vendem a categoria; bares e restaurantes não entraram. O número real de mídia no vazio é menor'],
    [13.0,'find',null,'Perda confirmada em R$ 5,5 a 5,8 mi. Rede A recorrente confirmada. Aprovado com uma ressalva','approve'],
    [13.1,'done',null,'Concluído']]};

  var chat=[
    [0,'user','Quanto a gente perdeu por ruptura em junho, e onde?',4],
    [3,'bot','Ruptura é difícil de medir só com venda. Você tem dados de estoque das lojas?',9],
    [5,'user','Não. Só venda. Dá pra inferir?',12],
    [10,'bot','Dá uma aproximação: dias em que a loja vende a categoria mas não vende a marca. Em junho isso aconteceu em 41 mil loja-dias, contra 9,8 mil de média.',22],
    [13,'user','E quanto isso custou?',25],
    [19,'bot','Depende do que a marca venderia normalmente nesses dias. Uma estimativa grosseira: R$ 4 a 6 milhões. Preciso refinar por loja.',36],
    [22,'user','Quem ficou com a venda?',39],
    [28,'bot','Nos dias de ruptura, a marca C cresceu 34% e a D 9%. A categoria caiu 6%, então parte da venda não foi para ninguém.',51],
    [31,'user','Em quais redes isso concentra?',54],
    [37,'bot','Duas redes de supermercado respondem por 1.410 das 2.140 lojas com ruptura. O resto é independente.',66],
    [40,'sys','Contexto cheio. A estimativa de perda do minuto 19 saiu da janela.',72],
    [41,'user','Volta na perda: qual era a faixa mesmo?',76],
    [46,'bot','Não tenho mais esse cálculo nesta conversa. Posso refazer se você me passar a venda por loja de novo.',88],
    [48,'user','Deixa. E a mídia, rodou onde não tinha produto?',91],
    [54,'bot','Provavelmente sim, já que as campanhas são nacionais, mas para cruzar mídia com ruptura por loja eu precisaria da entrega por região.',100],
    [56,'user','Me dá um resumo.',100],
    [61,'bot','Resumo: houve ruptura relevante em junho, concentrada em duas redes, com perda estimada em milhões e parte capturada por C e D. Recomendo pedir os dados de estoque ao varejo para quantificar.',100]
  ];

  return {
    pageTitle:'Ruptura · Swarm, by HYPR',
    title:'Quanto a marca perdeu por <em>ruptura</em> em junho, e onde?',
    lede:'Uma cerveja em supermercados. Sem dado de estoque, só notas fiscais, visitas e mídia. À esquerda, um chat tenta inferir a perda. À direita, sete agentes detectam a ruptura, medem a perda por dois caminhos, acham a mídia desperdiçada e separam o que é pontual do que é recorrente.',
    agents:agents, orq:orq, aud:aud, chat:chat, lastChat:61, lastAg:15,
    chatFail:'sem número',
    resultChat:'<div class="h"><h3>Resumo do chat</h3><span>61 min · 9 turnos · {tok} tokens</span></div>'+
      '<p>Houve <b>ruptura relevante</b> em junho, concentrada em duas redes, com perda "em milhões" e parte capturada por C e D.</p>'+
      '<p><span class="pill bad">perda</span>sem número final. "Recomendo pedir os dados de estoque ao varejo."</p>'+
      '<p><span class="pill bad">ação</span>nenhuma. A estimativa de perda se perdeu no caminho e mídia nunca foi cruzada com ruptura.</p>',
    resultAg:'<div class="h"><h3>Resposta do orquestrador</h3><span>{min} min · 1 pedido · {q} consultas · {tok} tokens</span></div>'+
      '<p><span class="pill good">hipótese 1 · confiança 88%</span>perda de <b>R$ 5,5 a 5,8 mi</b> em junho em 2.140 lojas, medida por dois caminhos independentes (venda esperada e visitas × conversão). 71% foi para as marcas C e D, 29% sumiu da loja.</p>'+
      '<p><span class="pill good">hipótese 2 · confiança 83%</span>a rede A tem ruptura estrutural de fim de mês, 8 dos últimos 12 meses, ≈ R$ 1,2 mi por mês. A rede B foi pontual.</p>'+
      '<p><span class="pill good">hipótese 3 · confiança 70%</span>R$ 380 mil de mídia (14% do mês) entregues onde nenhuma loja tinha produto. <b>Ressalva do auditor:</b> bares e restaurantes não entraram; o número real é menor.</p>'+
      '<p><span class="pill good">ação</span>reposição de fim de mês com a rede A; pausar mídia nas células em ruptura e redirecionar para onde há estoque, nas audiências <b>Compradores frequentes de cerveja</b> (11,2 mi) e <b>Visitantes de supermercados</b> (38,4 mi) com recorte por loja.</p>',
    compareChat:{1:'9',2:'61 min',3:'5, sob demanda da pessoa',4:'Nenhuma: só as que a pessoa pediu',5:'Não: cada resposta trata uma hipótese',6:'Estimativa de perda saiu do contexto no minuto 40',7:'Não: "em milhões", sem faixa',8:'Não: "pedir dados ao varejo"',10:'Não: quem respondeu foi quem conferiu'},
    c4:'4: zero de um dia, queda de fluxo, célula com várias lojas, reposição mensal',
    c7:'Sim: R$ 5,5 a 5,8 mi, rede A recorrente, R$ 380 mil de mídia no vazio',
    c8:'Sim, com rede, células de mídia e duas audiências',
    c10:'Sim: auditor refez a perda por outro método e achou uma ressalva (bares fora da conta)',
    foot:'Todos os dados vêm das bases HYPR: notas fiscais, lugares, visitas, audiências e performance das campanhas na rede. Não há dado de estoque; a ruptura é inferida.'
  };
})();
