window.SCENARIO=(function(){
  var agents=[
    {id:'a1', n:'Agente 1', role:'preço e promoção', uses:['rev'], l:[
      [0.3,'hyp',null,'Hipótese: ruptura de estoque ou mudança de preço'],
      [0.6,'conn','rev','revIQ · transactions.nf_items'],
      [0.9,'sql','rev','<k>SELECT</k> COUNT(DISTINCT store_id) lojas, SUM(qty) un\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> category = <s>\'protetor_solar\'</s> <k>AND</k> dt <k>BETWEEN</k> <s>\'2026-05-01\'</s> <k>AND</k> <s>\'2026-06-30\'</s>\n<k>GROUP BY</k> EXTRACT(MONTH <k>FROM</k> dt)'],
      [1.8,'res','rev','2 linhas · 1.204.318 lidas · 2,1 s · 388 MB'],
      [2.2,'dead',null,'Lojas vendendo: 9.812 em maio, 9.790 em junho. Não é ruptura.'],
      [2.6,'sql','rev','<k>SELECT</k> DATE_TRUNC(dt, WEEK) wk,\n  AVG(unit_price) preco, COUNTIF(discount > 0)/COUNT(*) promo\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> category = <s>\'protetor_solar\'</s> <k>AND</k> dt >= <s>\'2026-04-01\'</s>\n<k>GROUP BY</k> 1 <k>ORDER BY</k> 1'],
      [3.6,'res','rev','13 linhas · 1.611.902 lidas · 2,4 s · 512 MB'],
      [4.0,'note',null,'Preço médio +9% a partir da semana de 1/jun; promo cai de 31% para 12%'],
      [4.4,'conn','rev','revIQ · transactions.demand_idx'],
      [4.7,'sql','rev','<k>SELECT</k> month, demand_idx\n<k>FROM</k> `transactions.demand_idx`\n<k>WHERE</k> category = <s>\'protetor_solar\'</s> <k>AND</k> uf <k>IS NULL</k>'],
      [5.2,'res','rev','24 linhas · 0,4 s'],
      [5.8,'find',null,'Categoria caiu 7%, a marca caiu 18%: 11 pts são da marca. Promoção saiu em 2/jun e a queda começa nessa semana'],
      [6.2,'done',null,'Concluído']]},
    {id:'a2', n:'Agente 2', role:'clima', uses:['geo','rev'], l:[
      [0.3,'hyp',null,'Hipótese: inverno derrubou a demanda'],
      [0.6,'conn','geo','geoIQ · places.weather_daily'],
      [0.9,'sql','geo','<k>SELECT</k> EXTRACT(MONTH <k>FROM</k> dt) m, AVG(uv_index) uv\n<k>FROM</k> `places.weather_daily`\n<k>WHERE</k> dt >= <s>\'2026-05-01\'</s> <k>GROUP BY</k> 1'],
      [1.6,'res','geo','2 linhas · 0,3 s'],
      [2.0,'dead',null,'UV médio nacional: 7,1 → 6,4. Pouco para explicar 18%. Precisa abrir por cidade'],
      [2.4,'conn','geo','geoIQ · places.pois'],
      [2.7,'sql','geo','<k>SELECT</k> p.store_id, p.city, p.uf\n<k>FROM</k> `places.pois` p\n<k>WHERE</k> p.sells_category = <s>\'protetor_solar\'</s>'],
      [3.3,'res','geo','9.991 linhas · 0,6 s'],
      [3.6,'conn','rev','revIQ · transactions.nf_items'],
      [3.9,'sql','rev','<k>SELECT</k> w.city, AVG(w.uv_index) uv, SUM(n.qty) un\n<k>FROM</k> nf_items n <k>JOIN</k> pois p <k>USING</k> (store_id)\n<k>JOIN</k> weather_daily w <k>ON</k> w.city = p.city <k>AND</k> w.dt = n.dt\n<k>WHERE</k> n.dt >= <s>\'2026-05-01\'</s> <k>GROUP BY</k> 1'],
      [5.0,'res','rev','312 linhas · 2.816.220 lidas · 3,8 s · 744 MB'],
      [5.6,'find',null,'SP e litoral: 22 dias sem sol, UV 8 → 4, venda −21%. Natal e Recife: UV normal, venda −3%. Clima explica até 8 pts'],
      [6.0,'done',null,'Concluído']]},
    {id:'a3', n:'Agente 3', role:'concorrência', uses:['rev','ad'], l:[
      [0.3,'hyp',null,'Hipótese: alguém tomou share'],
      [0.6,'conn','rev','revIQ · transactions.nf_items'],
      [0.9,'sql','rev','<k>SELECT</k> brand, EXTRACT(MONTH <k>FROM</k> dt) m,\n  SUM(qty)/SUM(SUM(qty)) <k>OVER</k> (PARTITION BY EXTRACT(MONTH <k>FROM</k> dt)) share\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> category = <s>\'protetor_solar\'</s> <k>AND</k> dt >= <s>\'2026-03-01\'</s>\n<k>GROUP BY</k> 1, 2'],
      [2.0,'res','rev','24 linhas · 2.402.511 lidas · 3,1 s · 640 MB'],
      [2.5,'note',null,'4 marcas estáveis. Marca B: 11% → 17% em junho. Onde?'],
      [2.9,'sql','rev','<k>SELECT</k> channel, brand, AVG(discount) desc_medio\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> brand <k>IN</k> (<s>\'marca\'</s>, <s>\'B\'</s>) <k>AND</k> dt >= <s>\'2026-06-01\'</s>\n<k>GROUP BY</k> 1, 2'],
      [3.8,'res','rev','6 linhas · 1.198.004 lidas · 1,9 s'],
      [4.2,'note',null,'B com 25% off em farmácia; zero em supermercado'],
      [4.6,'conn','rev','revIQ · transactions.launches'],
      [4.9,'sql','rev','<k>SELECT</k> brand, launch_dt, line\n<k>FROM</k> `transactions.launches`\n<k>WHERE</k> category = <s>\'protetor_solar\'</s> <k>AND</k> launch_dt >= <s>\'2026-05-01\'</s>'],
      [5.4,'res','rev','1 linha · 0,2 s'],
      [5.8,'conn','geo','geoIQ · places.pois'],
      [6.1,'sql','geo','<k>SELECT</k> EXTRACT(MONTH <k>FROM</k> n.dt) m, COUNT(DISTINCT n.store_id) lojas_b\n<k>FROM</k> `transactions.nf_items` n <k>JOIN</k> `places.pois` p <k>USING</k> (store_id)\n<k>WHERE</k> n.brand = <s>\'B\'</s> <k>AND</k> p.channel = <s>\'farmacia\'</s> <k>GROUP BY</k> 1'],
      [6.8,'res','geo','2 linhas · 1.198.004 lidas · 1,8 s'],
      [7.3,'find',null,'B lançou linha em 1/jun com 25% off e passou de 3.100 para 5.400 farmácias com venda. Ganhou 6 pts, todos no canal farmácia'],
      [7.7,'done',null,'Concluído']]},
    {id:'a4', n:'Agente 4', role:'canal e região', uses:['rev','geo'], l:[
      [0.3,'hyp',null,'Hipótese: a queda é regional'],
      [0.6,'conn','geo','geoIQ · places.pois'],
      [0.9,'conn','rev','revIQ · transactions.nf_items'],
      [1.2,'sql','rev','<k>SELECT</k> p.uf, SUM(<k>IF</k>(m=6, qty, 0))/SUM(<k>IF</k>(m=5, qty, 0)) - 1 var\n<k>FROM</k> nf_items n <k>JOIN</k> pois p <k>USING</k> (store_id)\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>GROUP BY</k> 1 <k>ORDER BY</k> 2'],
      [2.3,'res','rev','27 linhas · 1.611.902 lidas · 2,6 s · 512 MB'],
      [2.8,'dead',null,'SP −26%, RS −23%, BA −9%, PE −4%. Parece clima, mas Sul e Sudeste também é onde tem mais farmácia. Abrir por canal'],
      [3.2,'sql','rev','<k>SELECT</k> p.region, n.channel,\n  SUM(<k>IF</k>(m=6, qty, 0))/SUM(<k>IF</k>(m=5, qty, 0)) - 1 var, SUM(qty) un\n<k>FROM</k> nf_items n <k>JOIN</k> pois p <k>USING</k> (store_id)\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>GROUP BY</k> 1, 2'],
      [4.4,'res','rev','15 linhas · 1.611.902 lidas · 2,5 s'],
      [5.0,'note',null,'Farmácia: −27% (58% do volume). Supermercado: −6%. Perfumaria: −3%'],
      [5.6,'find',null,'Farmácia no Sul e Sudeste: −31%. Farmácia no Nordeste: −5%. Supermercado cai pouco em todo lugar'],
      [6.0,'done',null,'Concluído']]},
    {id:'a5', n:'Agente 5', role:'mídia', uses:['ad','bid','ask'], l:[
      [0.3,'hyp',null,'Hipótese: a marca ficou invisível'],
      [0.6,'conn','ad','adsIQ · performance.media'],
      [0.9,'sql','ad','<k>SELECT</k> month, channel, SUM(spend) spend\n<k>FROM</k> `performance.media`\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> month >= <s>\'2026-03\'</s>\n<k>GROUP BY</k> 1, 2'],
      [1.8,'res','ad','16 linhas · 0,6 s'],
      [2.3,'dead',null,'Entrega das campanhas da marca na rede estável até abril. Não é alcance'],
      [2.7,'sql','ad','<k>SELECT</k> month, SUM(spend) digital,\n  AVG(attention_share) att\n<k>FROM</k> `performance.media`\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> channel <k>IN</k> (<s>\'digital\'</s>, <s>\'ooh\'</s>)\n<k>GROUP BY</k> 1'],
      [3.6,'res','ad','4 linhas · 0,5 s'],
      [4.0,'note',null,'Campanhas da marca na rede pausadas em maio (−40% de entrega). Share de atenção medido cai de 18% para 9% em junho'],
      [4.4,'conn','bid','bidIQ · audiences.exposure'],
      [4.7,'sql','bid','<k>SELECT</k> audience_name, audience_volume\n<k>FROM</k> `audiences.exposure`\n<k>WHERE</k> brand = <s>\'B\'</s> <k>AND</k> month = <s>\'2026-06\'</s>'],
      [5.3,'res','bid','1 linha · 0,3 s'],
      [5.6,'conn','ask','askIQ · surveys.brand_recall'],
      [5.8,'sql','ask','<k>SELECT</k> wave, recall_pct\n<k>FROM</k> `surveys.brand_recall`\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> wave >= <s>\'2026-04\'</s>'],
      [6.3,'res','ask','3 linhas · 0,2 s'],
      [6.8,'find',null,'Recall espontâneo 41% → 27% entre abril e junho (askIQ). 6,1 mi de pessoas da audiência da marca sem nenhum impacto em junho. A perda de atenção precede a queda em 3 semanas'],
      [7.1,'done',null,'Concluído']]}
  ];
  var orq={id:'orq', n:'Orquestrador', role:'', l:[
    [0.0,'note',null,'Pergunta recebida. Quebrando em 5 hipóteses: preço, clima, concorrência, canal/região, mídia'],
    [0.15,'note',null,'5 agentes disparados em paralelo, cada um com acesso às bases que precisa'],
    [8.0,'note',null,'Recebeu 5 conclusões. Somando: clima 8 + promoção 11 + concorrente 6 + mídia 9 = 34 pts. Não fecha com 18','gather'],
    [8.6,'note',null,'Sobreposição: promoção retirada, B na prateleira e campanhas pausadas são o mesmo evento visto de três lados. Agentes 1, 3 e 5 apontam a mesma semana'],
    [9.3,'note',null,'Pedindo ao Agente 2 um teste: onde não houve a B nem corte de mídia, quanto caiu?',['ask','a2']],
    [10.4,'note',null,'Agente 2: Nordeste, sem B e com sol, −4%. Clima sozinho em SP, sem o evento, seria ≈ −8%',['reply','a2']],
    [11.0,'note',null,'Reconciliado: clima ≈ 8 pts, evento de campanhas + promoção + concorrente ≈ 10 pts. Enviando ao Auditor','audit'],
    [13.6,'conn','bid','search_audiences("farmácia")'],
    [14.2,'res','bid','88 audiências · Visitantes de Farmácias · 21.647.167 pessoas · 9.991 endereços'],
    [14.8,'find',null,'Resposta pronta, auditada'],
    [15.0,'done',null,'Concluído']]};
  var aud={id:'aud', n:'Auditor', role:'', l:[
    [11.2,'hyp',null,'Recebeu só a conclusão e os números, não o raciocínio. Vai refazer os dois pilares por conta própria'],
    [11.4,'conn','rev','revIQ · transactions.nf_items'],
    [11.6,'sql','rev','<k>SELECT</k> brand, p.channel,\n  SUM(<k>IF</k>(m=6, qty, 0))/SUM(<k>IF</k>(m=5, qty, 0)) - 1 var\n<k>FROM</k> `transactions.nf_items` n <k>JOIN</k> `places.pois` p <k>USING</k> (store_id)\n<k>WHERE</k> category = <s>\'protetor_solar\'</s> <k>GROUP BY</k> 1, 2'],
    [12.3,'res','rev','18 linhas · 2.402.511 lidas · 3,0 s · 640 MB'],
    [12.5,'note',null,'Confere: marca −27% em farmácia, B +41% em farmácia, demais marcas entre −5% e −9%'],
    [12.6,'conn','geo','geoIQ · places.weather_daily'],
    [12.8,'sql','geo','<k>SELECT</k> p.region, AVG(w.uv_index) uv, SUM(n.qty) un\n<k>FROM</k> `transactions.nf_items` n <k>JOIN</k> `places.pois` p <k>USING</k> (store_id)\n<k>JOIN</k> `places.weather_daily` w <k>ON</k> w.city = p.city <k>AND</k> w.dt = n.dt\n<k>WHERE</k> n.brand = <s>\'marca\'</s> <k>AND</k> n.dt >= <s>\'2026-05-01\'</s> <k>GROUP BY</k> 1'],
    [13.2,'res','geo','5 linhas · 2.816.220 lidas · 3,6 s'],
    [13.3,'dead',null,'Ressalva: os agentes compararam junho com maio. Contra junho/2025 a queda é 17,6%, não 18%. Dentro da margem, mas vai na nota'],
    [13.4,'find',null,'Conta fecha: 8 + 10 = 18. Controle do Nordeste confirma o clima. Aprovado com uma ressalva','approve'],
    [13.5,'done',null,'Concluído']]};

  var chat=[
    [0,'user','Por que as vendas de protetor solar caíram 18% em junho?',4],
    [3,'bot','Pode ser sazonalidade: junho é inverno. Também pode ser preço, concorrência, mídia ou ruptura. Você tem os dados por canal?',9],
    [5,'user','Tenho. Vê primeiro se foi o clima.',12],
    [10,'bot','Junho teve 22 dias nublados ou chuvosos em SP e litoral; UV médio caiu de 8 para 4. Explica parte, mas em junho de 2025 a queda foi de 7%, então 18% é mais do que o esperado.',22],
    [13,'user','Ok. Então olha preço e promoção.',25],
    [19,'bot','Nas notas fiscais, o preço médio subiu 9% e as vendas com desconto caíram de 31% para 12% das transações. Houve retirada de promoção.',36],
    [22,'user','E concorrente? Alguém fez promoção?',39],
    [28,'bot','A marca B lançou uma linha nova com 25% de desconto em farmácias e ganhou 6 pontos de share no canal.',51],
    [31,'user','Isso foi em qual canal mesmo? Farmácia ou supermercado?',54],
    [37,'bot','Farmácia. A queda em farmácia foi de 27% e em supermercado de 6%. Farmácia é 58% do seu volume.',66],
    [40,'sys','Contexto cheio. A análise de clima do minuto 10 saiu da janela.',72],
    [41,'user','Espera, quanto era a parte do clima nisso tudo? Você falou antes.',76],
    [46,'bot','Não tenho mais esse detalhe nesta conversa. Pelo que sei, junho costuma cair por clima. Quer que eu refaça?',88],
    [48,'user','Não, esquece. E mídia, a gente cortou alguma coisa?',91],
    [54,'bot','Sim, 40% em maio, e o share de atenção caiu de 18% para 9%. Pode ter pesado, mas não consigo cruzar com o que vimos antes sem repetir a análise.',100],
    [56,'user','Ok, me manda um resumo com a causa principal.',100],
    [61,'bot','Resumo: a queda de 18% tem causas combinadas: clima, retirada de promoção, concorrente em farmácia e corte de mídia. Recomendo investigar qual pesou mais.',100]
  ];


  return {
    pageTitle:'Queda de venda · Swarm, by HYPR',
    title:'Por que as vendas de protetor solar caíram <em>18%</em> em junho?',
    lede:'A mesma pergunta, respondida de dois jeitos. À esquerda, uma pessoa num chat, uma hipótese por vez. À direita, sete agentes: um <b>orquestrador</b> quebra a pergunta em cinco hipóteses, cinco investigam ao mesmo tempo nas bases da HYPR e um auditor refaz a conta sem ter visto o trabalho.',
    agents:agents, orq:orq, aud:aud, chat:chat, lastChat:61, lastAg:15,
    chatFail:'sem causa principal',
    resultChat:'<div class="h"><h3>Resumo do chat</h3><span>61 min · 9 turnos · {tok} tokens</span></div>'+
      '<p>A queda de 18% em junho tem <b>causas combinadas</b>: clima, retirada de promoção, concorrente em farmácia e corte de mídia.</p>'+
      '<p><span class="pill bad">causa principal</span>não identificada. "Recomendo investigar qual pesou mais."</p>'+
      '<p><span class="pill bad">ação</span>nenhuma. A análise de clima se perdeu no caminho e a de mídia não foi cruzada com as outras.</p>',
    resultAg:'<div class="h"><h3>Resposta do orquestrador</h3><span>{min} min · 1 pedido · {q} consultas · {tok} tokens</span></div>'+
      '<p><span class="pill good">causa principal ≈ 10 pts · confiança 82%</span>um único evento visto de três lados. A marca pausou as campanhas na rede em maio e retirou promoção de farmácia em 2/jun (notas fiscais); na mesma semana a marca B entrou na mesma prateleira com 25% off e chegou a 5.400 farmácias. Share de atenção medido 18% → 9%, recall 41% → 27%.</p>'+
      '<p><span class="pill good">causa secundária ≈ 8 pts · confiança 74%</span>clima (fonte externa, INMET). 22 dias sem sol em SP e litoral, UV 8 → 4. Sazonal: no Nordeste, com sol e sem a B, a queda foi de 4%.</p>'+
      '<p><b>Descartado com dado:</b> ruptura de estoque, alcance das campanhas, UV nacional. <b>Ressalva do auditor:</b> contra junho/2025 a queda é 17,6%.</p>'+
      '<p><span class="pill good">ação</span>retomar promoção e campanhas em farmácia no Sul e Sudeste antes de outubro, na audiência <b>Visitantes de Farmácias</b> (21,6 mi de pessoas, 9.991 endereços) com recorte geográfico.</p>',
    compareChat:{1:'9',2:'61 min',3:'5, sob demanda da pessoa',4:'Nenhuma: só as que a pessoa pediu',5:'Não: cada resposta trata uma hipótese',6:'Análise de clima saiu do contexto no minuto 40',7:'Não: "causas combinadas", sem peso',8:'Não: "recomendo investigar"',10:'Não: quem respondeu foi quem conferiu'},
    c4:'4: ruptura, UV nacional, alcance, UF sem canal',
    c7:'Sim: campanhas e promoção ≈ 10 pts, clima ≈ 8 pts',
    c8:'Sim, com audiência e volume',
    c10:'Sim: auditor refez 2 consultas e achou uma ressalva (base de comparação)',
    foot:'Clima vem de fonte externa (INMET); o resto vem das bases HYPR: notas fiscais, lugares, audiências, performance das campanhas na rede e pesquisas.'
  };
})();
