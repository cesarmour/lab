window.SCENARIO=(function(){
  var agents=[
    {id:'a1', n:'Agente 1', role:'portfólio', uses:['rev'], l:[
      [0.3,'hyp',null,'Hipótese: o portfólio cresceu com o sabor novo'],
      [0.6,'conn','rev','revIQ · transactions.nf_items'],
      [0.9,'sql','rev','<k>SELECT</k> sku, EXTRACT(MONTH <k>FROM</k> dt) m, SUM(qty) un\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> category = <s>\'iogurte\'</s>\n  <k>AND</k> dt >= <s>\'2026-05-01\'</s> <k>GROUP BY</k> 1, 2'],
      [1.9,'res','rev','14 linhas · 2.044.117 lidas · 2,6 s · 612 MB'],
      [2.3,'note',null,'Portfólio: +4% em volume. Novo (morango-chia): 410 mil un. Antigo (morango): −38%'],
      [2.7,'dead',null,'Portfólio cresceu, mas o antigo caiu quase o mesmo que o novo vendeu. Olhar a categoria'],
      [3.1,'sql','rev','<k>SELECT</k> brand, EXTRACT(MONTH <k>FROM</k> dt) m, SUM(qty) un\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> category = <s>\'iogurte\'</s> <k>AND</k> dt >= <s>\'2026-05-01\'</s>\n<k>GROUP BY</k> 1, 2'],
      [4.1,'res','rev','18 linhas · 6.802.310 lidas · 4,1 s · 1,7 GB'],
      [4.6,'note',null,'Categoria +1%. Share da marca 24,1% → 24,8%'],
      [5.3,'find',null,'Dos 410 mil do novo, 330 mil vieram do antigo e 80 mil são novos para a marca. Incremento bruto: 20%'],
      [5.7,'done',null,'Concluído']]},
    {id:'a2', n:'Agente 2', role:'canal e região', uses:['geo','rev'], l:[
      [0.3,'hyp',null,'Hipótese: a canibalização depende de onde os dois estão juntos'],
      [0.6,'conn','geo','geoIQ · places.pois'],
      [0.9,'conn','rev','revIQ · transactions.nf_items'],
      [1.2,'sql','rev','<k>SELECT</k> p.channel, p.region,\n  SUM(<k>IF</k>(sku=<s>\'novo\'</s>, qty, 0)) novo, SUM(<k>IF</k>(sku=<s>\'antigo\'</s>, qty, 0)) antigo\n<k>FROM</k> nf_items n <k>JOIN</k> pois p <k>USING</k> (store_id)\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> dt >= <s>\'2026-06-01\'</s> <k>GROUP BY</k> 1, 2'],
      [2.4,'res','rev','15 linhas · 2.044.117 lidas · 2,8 s · 612 MB'],
      [2.9,'dead',null,'Por região é parecido em todo lugar. Não é geográfico. Abrir por tipo de loja'],
      [3.3,'sql','rev','<k>SELECT</k> p.channel,\n  COUNTIF(has_novo <k>AND</k> has_antigo) ambos, COUNTIF(has_novo <k>AND NOT</k> has_antigo) so_novo\n<k>FROM</k> store_mix <k>JOIN</k> pois p <k>USING</k> (store_id)\n<k>GROUP BY</k> 1'],
      [4.3,'res','rev','4 linhas · 1,1 s'],
      [4.8,'note',null,'Supermercado: 92% das lojas têm os dois. Conveniência: 61% só têm o novo'],
      [5.4,'find',null,'Onde só o novo está na prateleira (conveniência), a marca cresce 31%. Onde estão lado a lado, cresce 1%'],
      [5.8,'done',null,'Concluído']]},
    {id:'a3', n:'Agente 3', role:'cesta', uses:['rev'], l:[
      [0.3,'hyp',null,'Hipótese: quem comprou o novo deixou de comprar o antigo na mesma nota'],
      [0.6,'conn','rev','revIQ · transactions.nf_items'],
      [0.9,'sql','rev','<k>SELECT</k> COUNTIF(has_novo <k>AND</k> has_antigo) juntos,\n  COUNTIF(has_novo <k>AND NOT</k> has_antigo) so_novo, COUNTIF(has_antigo <k>AND NOT</k> has_novo) so_antigo\n<k>FROM</k> (<k>SELECT</k> nf_id, LOGICAL_OR(sku=<s>\'novo\'</s>) has_novo, LOGICAL_OR(sku=<s>\'antigo\'</s>) has_antigo\n  <k>FROM</k> `transactions.nf_items` <k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> dt >= <s>\'2026-06-01\'</s> <k>GROUP BY</k> 1)'],
      [2.2,'res','rev','1 linha · 3.118.902 lidas · 3,4 s · 920 MB'],
      [2.7,'note',null,'Só 6% das notas levam os dois. Não é compra adicional, é troca'],
      [3.1,'sql','rev','<k>SELECT</k> other_sku, COUNT(*) notas\n<k>FROM</k> basket_pairs\n<k>WHERE</k> sku = <s>\'novo\'</s> <k>AND</k> dt >= <s>\'2026-06-01\'</s>\n<k>GROUP BY</k> 1 <k>ORDER BY</k> 2 <k>DESC LIMIT</k> 10'],
      [4.0,'res','rev','10 linhas · 2,2 s'],
      [4.5,'dead',null,'Cesta do novo tem granola e fruta; a do antigo, pão e leite. Perfis diferentes de ocasião, mas a nota é só uma foto'],
      [5.2,'find',null,'A troca é o padrão dominante (94% das notas). A cesta sugere ocasião diferente, mas sem o comprador não dá para afirmar'],
      [5.6,'done',null,'Concluído']]},
    {id:'a4', n:'Agente 4', role:'audiência', uses:['bid','geo'], l:[
      [0.3,'hyp',null,'Hipótese: o novo trouxe gente nova para a marca'],
      [0.6,'conn','bid','bidIQ · audiences.catalog'],
      [0.9,'sql','bid','<k>SELECT</k> audience_name, audience_volume\n<k>FROM</k> `audiences.catalog`\n<k>WHERE</k> sku <k>IN</k> (<s>\'novo\'</s>, <s>\'antigo\'</s>)'],
      [1.7,'res','bid','2 linhas · 0,4 s'],
      [2.1,'note',null,'Compradores do antigo: 3,9 mi. Compradores do novo: 1,2 mi'],
      [2.5,'conn','geo','geoIQ · places.visits'],
      [2.8,'sql','geo','<k>SELECT</k> COUNT(DISTINCT device) pessoas\n<k>FROM</k> `places.visits` v <k>JOIN</k> `audiences.members` a <k>USING</k> (device)\n<k>WHERE</k> a.audience = <s>\'compradores_novo\'</s> <k>AND</k> a.device <k>NOT IN</k> (<k>SELECT</k> device <k>FROM</k> `audiences.members` <k>WHERE</k> audience = <s>\'compradores_antigo_12m\'</s>)'],
      [4.0,'res','geo','1 linha · 4.210.550 lidas · 3,9 s'],
      [4.5,'note',null,'Da audiência do novo, 22% nunca compraram o antigo nos últimos 12 meses'],
      [5.2,'find',null,'O novo trouxe 260 mil pessoas novas para a marca, concentradas em lojas de conveniência e academias. O resto migrou'],
      [5.6,'done',null,'Concluído']]},
    {id:'a5', n:'Agente 5', role:'intenção', uses:['ask','ad'], l:[
      [0.3,'hyp',null,'Hipótese: o antigo caiu por falta de mídia, não por troca'],
      [0.6,'conn','ad','adsIQ · performance.media'],
      [0.9,'sql','ad','<k>SELECT</k> sku, month, SUM(impressions) imp, AVG(attention_share) att\n<k>FROM</k> `performance.media`\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> month >= <s>\'2026-04\'</s> <k>GROUP BY</k> 1, 2'],
      [1.8,'res','ad','6 linhas · 0,5 s'],
      [2.3,'dead',null,'Toda a mídia foi para o novo desde maio. O antigo ficou sem campanha, mas sua queda começou só quando o novo chegou à loja'],
      [2.7,'conn','ask','askIQ · surveys.intent'],
      [3.0,'sql','ask','<k>SELECT</k> answer, COUNT(*) n\n<k>FROM</k> `surveys.intent`\n<k>WHERE</k> question = <s>\'por que escolheu morango-chia\'</s> <k>AND</k> wave = <s>\'2026-06\'</s>\n<k>GROUP BY</k> 1'],
      [3.9,'res','ask','5 linhas · 0,3 s'],
      [4.4,'note',null,'"Queria o de sempre com algo a mais": 58%. "Nunca comprava iogurte da marca": 19%'],
      [5.1,'find',null,'A pesquisa bate com a cesta e a audiência: cerca de um quinto é novo para a marca, o resto é o mesmo comprador trocando de sabor'],
      [5.5,'done',null,'Concluído']]}
  ];
  var orq={id:'orq', n:'Orquestrador', role:'', l:[
    [0.0,'note',null,'Pergunta recebida. Quebrando em 5 hipóteses: portfólio, canal/região, cesta, audiência, intenção'],
    [0.15,'note',null,'5 agentes disparados em paralelo, cada um com acesso às bases que precisa'],
    [7.0,'note',null,'Recebeu 5 conclusões. Três medidas independentes de "novo para a marca": 20% (venda), 22% (audiência), 19% (pesquisa). Convergem','gather'],
    [7.6,'note',null,'Divergência no canal: conveniência cresce 31%, supermercado 1%. Precisa saber se é o mesmo comprador em lugares diferentes'],
    [8.3,'note',null,'Pedindo ao Agente 4 um teste: as pessoas novas da conveniência compram em supermercado também?',['ask','a4']],
    [9.4,'note',null,'Agente 4: 71% das pessoas novas só aparecem em conveniência e academia. É público que a marca não alcançava',['reply','a4']],
    [10.0,'note',null,'Reconciliado: incremento real ≈ 20%, canibalização ≈ 80%; o incremento vem de um canal e um público específicos. Enviando ao Auditor','audit'],
    [12.6,'conn','bid','search_audiences("academia conveniência")'],
    [13.2,'res','bid','Frequentadores de academias · 8.900.000 pessoas · Visitantes de lojas de conveniência · 14.300.000 pessoas'],
    [13.8,'find',null,'Resposta pronta, auditada'],
    [14.0,'done',null,'Concluído']]};
  var aud={id:'aud', n:'Auditor', role:'', l:[
    [10.2,'hyp',null,'Recebeu só as conclusões e os números. Vai refazer o incremento por outro caminho'],
    [10.4,'conn','rev','revIQ · transactions.nf_items'],
    [10.6,'sql','rev','<k>SELECT</k> EXTRACT(MONTH <k>FROM</k> dt) m, SUM(qty) un\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> sku <k>IN</k> (<s>\'novo\'</s>, <s>\'antigo\'</s>)\n  <k>AND</k> dt <k>BETWEEN</k> <s>\'2025-06-01\'</s> <k>AND</k> <s>\'2026-06-30\'</s> <k>GROUP BY</k> 1'],
      [11.3,'res','rev','13 linhas · 2.044.117 lidas · 2,5 s · 612 MB'],
    [11.5,'note',null,'Contra junho/2025 (sem o novo), a linha morango cresceu 17%. O agente disse 20% contra maio'],
    [11.7,'conn','geo','geoIQ · places.pois'],
    [11.9,'sql','geo','<k>SELECT</k> p.channel, SUM(qty) un\n<k>FROM</k> `transactions.nf_items` n <k>JOIN</k> `places.pois` p <k>USING</k> (store_id)\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> sku = <s>\'novo\'</s> <k>AND</k> dt >= <s>\'2026-06-01\'</s> <k>GROUP BY</k> 1'],
    [12.3,'res','geo','4 linhas · 1,2 s'],
    [12.4,'dead',null,'Ressalva: junho/2025 teve promoção do antigo; a base inflada derruba o incremento para 17%. Faixa honesta: 17 a 20%'],
    [12.5,'find',null,'Conta fecha dentro da faixa. Canal e público confirmados. Aprovado com uma ressalva','approve'],
    [12.6,'done',null,'Concluído']]};

  var chat=[
    [0,'user','O sabor novo (morango-chia) cresceu a marca ou só roubou do morango normal?',4],
    [3,'bot','Para responder preciso comparar o portfólio antes e depois. Você tem venda por SKU por mês?',9],
    [5,'user','Tenho. Olha o total da marca.',12],
    [10,'bot','A marca cresceu 4% em volume em junho. O novo vendeu 410 mil unidades e o morango normal caiu 38%.',22],
    [13,'user','Então foi tudo canibalização?',25],
    [18,'bot','Quase: se o antigo caiu 330 mil e o novo vendeu 410 mil, cerca de 80 mil são incremento. Mas pode haver sazonalidade no antigo.',36],
    [21,'user','E por canal, muda alguma coisa?',39],
    [27,'bot','Em conveniência a marca cresce 31%; em supermercado, 1%. Em conveniência muitas lojas só têm o novo.',51],
    [30,'user','E a gente trouxe gente nova ou é o mesmo comprador?',54],
    [36,'bot','Pela cesta, só 6% das notas levam os dois. A cesta do novo tem granola e fruta, a do antigo tem pão e leite. Parece ocasião diferente.',66],
    [39,'sys','Contexto cheio. A análise de portfólio do minuto 10 saiu da janela.',72],
    [40,'user','Espera, quanto era o incremento em unidades mesmo?',76],
    [45,'bot','Não tenho mais esse número nesta conversa. Posso refazer a conta se você passar os dados de novo.',88],
    [47,'user','Deixa. Vale manter os dois na prateleira?',91],
    [53,'bot','Depende de quanto do novo é incremento real, e isso varia por canal. Sem cruzar canal, cesta e comprador não consigo dar um número.',100],
    [55,'user','Me dá um resumo então.',100],
    [60,'bot','Resumo: o novo cresceu a marca em 4%, canibalizou boa parte do antigo, cresce mais em conveniência e parece atrair outra ocasião. Recomendo um estudo de comprador para separar incremento de canibalização.',100]
  ];

  return {
    pageTitle:'Canibalização · Swarm, by HYPR',
    title:'O sabor novo cresceu a marca ou só roubou do <em>antigo</em>?',
    lede:'Um lançamento de iogurte morango-chia. O portfólio cresceu 4%, o sabor antigo caiu 38%. À esquerda, um chat tenta separar incremento de canibalização. À direita, sete agentes medem a mesma coisa por três caminhos independentes e cruzam.',
    agents:agents, orq:orq, aud:aud, chat:chat, lastChat:60, lastAg:14,
    chatFail:'sem número',
    resultChat:'<div class="h"><h3>Resumo do chat</h3><span>60 min · 9 turnos · {tok} tokens</span></div>'+
      '<p>O novo cresceu a marca em 4%, <b>canibalizou boa parte</b> do antigo, cresce mais em conveniência e parece atrair outra ocasião.</p>'+
      '<p><span class="pill bad">incremento real</span>não quantificado. "Recomendo um estudo de comprador."</p>'+
      '<p><span class="pill bad">ação</span>nenhuma. O número de unidades se perdeu no caminho e canal, cesta e comprador não foram cruzados.</p>',
    resultAg:'<div class="h"><h3>Resposta do orquestrador</h3><span>{min} min · 1 pedido · {q} consultas · {tok} tokens</span></div>'+
      '<p><span class="pill good">hipótese 1 · confiança 86%</span>o novo é <b>80% troca e 20% incremento</b> (faixa 17 a 20%). Três medidas independentes convergem: venda (20%), audiência (22%), pesquisa (19%).</p>'+
      '<p><span class="pill good">hipótese 2 · confiança 79%</span>o incremento vem de um público e um canal específicos: 260 mil pessoas que nunca compraram o antigo, 71% delas só em conveniência e academia.</p>'+
      '<p><b>Descartado com dado:</b> queda do antigo por falta de mídia, efeito regional. <b>Ressalva do auditor:</b> junho/2025 teve promoção do antigo; incremento entre 17% e 20%.</p>'+
      '<p><span class="pill good">ação</span>manter os dois onde estão lado a lado e levar só o novo para conveniência e academia, nas audiências <b>Frequentadores de academias</b> (8,9 mi) e <b>Visitantes de lojas de conveniência</b> (14,3 mi).</p>',
    compareChat:{1:'9',2:'60 min',3:'5, sob demanda da pessoa',4:'Nenhuma: só as que a pessoa pediu',5:'Não: cada resposta trata uma hipótese',6:'Incremento em unidades saiu do contexto no minuto 39',7:'Não: "canibalizou boa parte", sem número',8:'Não: "recomendo um estudo"',10:'Não: quem respondeu foi quem conferiu'},
    c4:'2: queda do antigo por falta de mídia, efeito regional',
    c7:'Sim: 80% troca, 17 a 20% incremento, com três medidas convergentes',
    c8:'Sim, com canal, duas audiências e volume',
    c10:'Sim: auditor refez o incremento contra junho/2025 e achou uma ressalva (promoção na base)',
    foot:'Todos os dados vêm das bases HYPR: notas fiscais, lugares, audiências, performance das campanhas na rede e pesquisas.'
  };
})();
