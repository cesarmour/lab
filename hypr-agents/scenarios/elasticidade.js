window.SCENARIO=(function(){
  var agents=[
    {id:'a1', n:'Agente 1', role:'curva de preço', uses:['rev'], l:[
      [0.3,'hyp',null,'Hipótese: existe uma faixa de desconto onde o volume compensa a margem'],
      [0.6,'conn','rev','revIQ · transactions.nf_items'],
      [0.9,'sql','rev','<k>SELECT</k> ROUND(discount, 2) desc, SUM(qty) un, COUNT(DISTINCT store_id) lojas\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> category = <s>\'amaciante\'</s>\n  <k>AND</k> dt >= <s>\'2025-07-01\'</s> <k>GROUP BY</k> 1 <k>ORDER BY</k> 1'],
      [2.1,'res','rev','31 linhas · 18.206.511 lidas · 7,4 s · 4,6 GB'],
      [2.6,'note',null,'Sem desconto: base. 10%: +18% volume. 20%: +61%. 30%: +74%. 40%: +79%'],
      [3.0,'dead',null,'Volume por faixa mistura canais e meses. Precisa normalizar por loja-semana'],
      [3.4,'sql','rev','<k>SELECT</k> desc_bucket, AVG(qty / baseline_qty) lift\n<k>FROM</k> store_week\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>GROUP BY</k> 1'],
      [4.5,'res','rev','5 linhas · 3,1 s'],
      [5.0,'note',null,'Lift normalizado: 10% → 1,15; 20% → 1,52; 30% → 1,61; 40% → 1,64'],
      [5.6,'find',null,'A curva achata depois de 20%. Entre 20% e 40% o volume sobe 8% e a margem por unidade cai pela metade'],
      [6.0,'done',null,'Concluído']]},
    {id:'a2', n:'Agente 2', role:'canal e região', uses:['geo','rev'], l:[
      [0.3,'hyp',null,'Hipótese: a elasticidade muda por tipo de loja'],
      [0.6,'conn','geo','geoIQ · places.pois'],
      [0.9,'conn','rev','revIQ · transactions.nf_items'],
      [1.2,'sql','rev','<k>SELECT</k> p.channel, desc_bucket, AVG(qty / baseline_qty) lift\n<k>FROM</k> store_week s <k>JOIN</k> `places.pois` p <k>USING</k> (store_id)\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>GROUP BY</k> 1, 2'],
      [2.4,'res','rev','20 linhas · 18.206.511 lidas · 7,1 s · 4,6 GB'],
      [2.9,'note',null,'Atacarejo: lift 2,1 a 20%. Supermercado: 1,4. Farmácia: 1,1. Vizinhança: 1,2'],
      [3.3,'dead',null,'Atacarejo pode ser compra de revenda, não consumidor. Ver tamanho da cesta'],
      [3.7,'sql','rev','<k>SELECT</k> p.channel, AVG(qty_per_nf) un_por_nota\n<k>FROM</k> `transactions.nf_items` n <k>JOIN</k> `places.pois` p <k>USING</k> (store_id)\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> discount >= 0.2 <k>GROUP BY</k> 1'],
      [4.6,'res','rev','4 linhas · 2,2 s'],
      [5.1,'note',null,'Atacarejo com desconto: 6,4 unidades por nota, contra 1,3 no supermercado. É estoque, não consumo'],
      [5.7,'find',null,'Supermercado responde bem a 20% (lift 1,4). Atacarejo responde mais, mas antecipa compra. Farmácia quase não responde'],
      [6.1,'done',null,'Concluído']]},
    {id:'a3', n:'Agente 3', role:'reação do concorrente', uses:['rev'], l:[
      [0.3,'hyp',null,'Hipótese: o concorrente segue a promoção e anula o ganho'],
      [0.6,'conn','rev','revIQ · transactions.nf_items'],
      [0.9,'sql','rev','<k>SELECT</k> week, brand, AVG(discount) desc\n<k>FROM</k> `transactions.nf_items`\n<k>WHERE</k> category = <s>\'amaciante\'</s> <k>AND</k> dt >= <s>\'2025-07-01\'</s>\n<k>GROUP BY</k> 1, 2 <k>ORDER BY</k> 1'],
      [2.0,'res','rev','312 linhas · 41.880.200 lidas · 9,8 s · 10,1 GB'],
      [2.5,'note',null,'Em 9 das 11 promoções da marca acima de 25%, a marca E respondeu com desconto igual ou maior na semana seguinte'],
      [2.9,'dead',null,'Correlação de semana não prova resposta. Ver o que E fez quando a marca ficou em 20%'],
      [3.3,'sql','rev','<k>SELECT</k> marca_desc_bucket, AVG(e_desc_next_week) resposta_e\n<k>FROM</k> promo_weeks <k>GROUP BY</k> 1'],
      [4.3,'res','rev','5 linhas · 1,8 s'],
      [4.8,'note',null,'Marca a 20%: E responde em 2 de 14 semanas. Marca a 30%+: E responde em 9 de 11'],
      [5.4,'find',null,'Existe um limiar: até 20% a marca promove sozinha; acima de 25% vira guerra de preço e o lift líquido cai para 1,2'],
      [5.8,'done',null,'Concluído']]},
    {id:'a4', n:'Agente 4', role:'promoção com mídia', uses:['ad','rev'], l:[
      [0.3,'hyp',null,'Hipótese: a promoção rende mais quando tem campanha junto'],
      [0.6,'conn','ad','adsIQ · performance.media'],
      [0.9,'sql','ad','<k>SELECT</k> week, SUM(impressions) imp, AVG(attention_share) att\n<k>FROM</k> `performance.media`\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> week >= <s>\'2025-07\'</s> <k>GROUP BY</k> 1'],
      [1.8,'res','ad','52 linhas · 0,7 s'],
      [2.2,'conn','rev','revIQ · transactions.nf_items'],
      [2.5,'sql','rev','<k>SELECT</k> has_media, desc_bucket, AVG(lift) lift\n<k>FROM</k> promo_weeks p <k>JOIN</k> media_weeks m <k>USING</k> (week)\n<k>GROUP BY</k> 1, 2'],
      [3.6,'res','rev','10 linhas · 2,9 s'],
      [4.1,'note',null,'20% sem mídia: lift 1,38. 20% com campanha na rede: 1,71'],
      [4.5,'dead',null,'Semanas com mídia podem ser as de maior sazonalidade. Controlar por semana do ano'],
      [4.9,'sql','rev','<k>SELECT</k> has_media, AVG(lift / seasonal_index) lift_adj\n<k>FROM</k> promo_weeks <k>WHERE</k> desc_bucket = 0.2 <k>GROUP BY</k> 1'],
      [5.6,'res','rev','2 linhas · 1,4 s'],
      [6.1,'find',null,'Ajustado por sazonalidade, mídia junto com 20% leva o lift de 1,36 para 1,62. A campanha vale 0,26 de lift, mais que ir de 20% para 40% de desconto'],
      [6.5,'done',null,'Concluído']]},
    {id:'a5', n:'Agente 5', role:'sensibilidade', uses:['ask','bid'], l:[
      [0.3,'hyp',null,'Hipótese: quem diz ser sensível a preço não é quem responde à promoção'],
      [0.6,'conn','ask','askIQ · surveys.price_sensitivity'],
      [0.9,'sql','ask','<k>SELECT</k> segment, AVG(would_switch_at_10) p10, AVG(would_switch_at_20) p20\n<k>FROM</k> `surveys.price_sensitivity`\n<k>WHERE</k> category = <s>\'amaciante\'</s> <k>AND</k> wave = <s>\'2026-05\'</s> <k>GROUP BY</k> 1'],
      [1.8,'res','ask','4 linhas · 0,3 s'],
      [2.3,'note',null,'Declarado: 61% trocariam de marca por 20% off. Observado pelo Agente 1: lift 1,5, bem abaixo do que 61% implicaria'],
      [2.7,'conn','bid','bidIQ · audiences.catalog'],
      [3.0,'sql','bid','<k>SELECT</k> audience_name, audience_volume\n<k>FROM</k> `audiences.catalog`\n<k>WHERE</k> tag <k>IN</k> (<s>\'promo_responders\'</s>, <s>\'price_sensitive\'</s>) <k>AND</k> category = <s>\'limpeza\'</s>'],
      [3.8,'res','bid','3 linhas · 0,4 s'],
      [4.2,'dead',null,'As duas audiências se sobrepõem em 40%. Separar quem de fato muda de comportamento na nota'],
      [4.6,'sql','bid','<k>SELECT</k> audience, AVG(bought_on_promo) - AVG(bought_off_promo) delta\n<k>FROM</k> member_outcomes <k>WHERE</k> category = <s>\'amaciante\'</s> <k>GROUP BY</k> 1'],
      [5.5,'res','bid','2 linhas · 2,6 s'],
      [6.0,'find',null,'"Caçadores de promoção" respondem 3x mais que "sensíveis a preço declarados". A pesquisa superestima; a nota fiscal mostra quem age'],
      [6.4,'done',null,'Concluído']]}
  ];
  var orq={id:'orq', n:'Orquestrador', role:'', l:[
    [0.0,'note',null,'Pergunta recebida. Quebrando em 5 hipóteses: curva de preço, canal/região, reação do concorrente, promoção com mídia, sensibilidade'],
    [0.15,'note',null,'5 agentes disparados em paralelo, cada um com acesso às bases que precisa'],
    [7.4,'note',null,'Recebeu 5 conclusões. Curva achata em 20%; concorrente reage acima de 25%; mídia vale 0,26 de lift; atacarejo é antecipação; caçadores de promoção respondem 3x','gather'],
    [8.0,'note',null,'Os achados 1 e 3 apontam para o mesmo limiar por caminhos diferentes: 20% é o teto onde a curva achata e onde o concorrente ainda não reage'],
    [8.7,'note',null,'Pedindo ao Agente 2 um teste: o lift de 1,4 do supermercado a 20% se sustenta nas 4 semanas seguintes ou é antecipação como no atacarejo?',['ask','a2']],
    [9.8,'note',null,'Agente 2: supermercado volta à base em 1 semana, sem queda abaixo da base. Não é antecipação. Atacarejo cai 18% abaixo da base por 3 semanas',['reply','a2']],
    [10.4,'note',null,'Reconciliado: 20% em supermercado com campanha junto é o ponto ótimo; atacarejo só com 10%; farmácia sem promoção. Enviando ao Auditor','audit'],
    [13.0,'conn','bid','search_audiences("promoção limpeza")'],
    [13.6,'res','bid','Caçadores de promoção em limpeza · 6.700.000 pessoas · Visitantes de supermercados · 38.400.000 pessoas'],
    [14.2,'find',null,'Resposta pronta, auditada'],
    [14.4,'done',null,'Concluído']]};
  var aud={id:'aud', n:'Auditor', role:'', l:[
    [10.6,'hyp',null,'Recebeu só as conclusões e os números. Vai refazer a curva e o efeito da mídia por conta própria'],
    [10.8,'conn','rev','revIQ · transactions.nf_items'],
    [11.0,'sql','rev','<k>SELECT</k> desc_bucket, SUM(qty * (price - cost)) margem_total\n<k>FROM</k> store_week s <k>JOIN</k> `places.pois` p <k>USING</k> (store_id)\n<k>WHERE</k> brand = <s>\'marca\'</s> <k>AND</k> p.channel = <s>\'supermercado\'</s> <k>GROUP BY</k> 1'],
    [11.8,'res','rev','5 linhas · 18.206.511 lidas · 6,9 s · 4,6 GB'],
    [12.0,'note',null,'Margem total por faixa, supermercado: 10% → +9%; 20% → +14%; 30% → +3%; 40% → −11%. Confere: ótimo em 20%'],
    [12.2,'conn','ad','adsIQ · performance.media'],
    [12.4,'sql','ad','<k>SELECT</k> has_media, AVG(lift) <k>FROM</k> promo_weeks\n<k>WHERE</k> desc_bucket = 0.2 <k>AND</k> week <k>NOT IN</k> (<s>\'2025-48\'</s>, <s>\'2025-49\'</s>) <k>GROUP BY</k> 1'],
    [12.7,'res','ad','2 linhas · 1,3 s'],
    [12.8,'dead',null,'Ressalva: tirando Black Friday, o efeito da mídia cai de 0,26 para 0,19. Ainda vale mais que subir o desconto, mas o número do agente estava inflado'],
    [12.9,'find',null,'Ponto ótimo confirmado em 20% para supermercado. Efeito da mídia entre 0,19 e 0,26. Aprovado com uma ressalva','approve'],
    [13.0,'done',null,'Concluído']]};

  var chat=[
    [0,'user','Qual desconto compensa para o amaciante, e em qual canal?',4],
    [3,'bot','Preciso da curva de volume por nível de desconto. Você tem histórico de promoções com venda?',9],
    [5,'user','Tenho 12 meses. Começa pela curva geral.',12],
    [10,'bot','Com 10% de desconto o volume sobe 18%; com 20%, 61%; com 30%, 74%; com 40%, 79%. A curva achata depois de 20%.',22],
    [13,'user','E por canal?',25],
    [19,'bot','Atacarejo responde muito mais (lift 2,1 a 20%), supermercado 1,4, farmácia 1,1. Mas no atacarejo pode ser compra de estoque.',36],
    [22,'user','O concorrente acompanha quando a gente promove?',39],
    [28,'bot','Em 9 das 11 promoções acima de 25%, a marca E respondeu com desconto igual ou maior na semana seguinte. Abaixo disso, raramente.',51],
    [31,'user','E se a gente colocar mídia junto?',54],
    [37,'bot','Semanas com campanha e 20% de desconto tiveram lift 1,71 contra 1,38 sem campanha. Pode haver sazonalidade misturada.',66],
    [40,'sys','Contexto cheio. A curva de preço do minuto 10 saiu da janela.',72],
    [41,'user','Então qual é o ponto ótimo? Junta tudo.',76],
    [46,'bot','Não tenho mais a curva nesta conversa. Pelo que lembro, algo entre 20% e 30%, mas preciso refazer para dizer o ponto exato.',88],
    [48,'user','E a pesquisa de sensibilidade a preço, bate?',91],
    [54,'bot','A pesquisa diz que 61% trocariam por 20% off, mais do que o volume observado sugere. Declarado e observado divergem.',100],
    [56,'user','Me dá a recomendação.',100],
    [61,'bot','Resumo: desconto entre 20% e 30%, evitando passar de 25% por causa do concorrente, com mídia junto se possível. Recomendo um teste controlado por canal para fechar o número.',100]
  ];

  return {
    pageTitle:'Elasticidade · Swarm, by HYPR',
    title:'Qual desconto <em>compensa</em>, e em qual canal?',
    lede:'Um amaciante, 12 meses de promoções. À esquerda, um chat monta a curva, mas perde o começo quando chega a hora de juntar tudo. À direita, sete agentes cruzam curva de preço, canal, reação do concorrente, mídia e comportamento real na nota, e chegam a um ponto ótimo por canal.',
    agents:agents, orq:orq, aud:aud, chat:chat, lastChat:61, lastAg:15,
    chatFail:'sem ponto ótimo',
    resultChat:'<div class="h"><h3>Resumo do chat</h3><span>61 min · 9 turnos · {tok} tokens</span></div>'+
      '<p>Desconto <b>entre 20% e 30%</b>, evitando passar de 25% por causa do concorrente, com mídia junto se possível.</p>'+
      '<p><span class="pill bad">ponto ótimo</span>não fechado. "Recomendo um teste controlado por canal."</p>'+
      '<p><span class="pill bad">ação</span>nenhuma por canal. A curva se perdeu no caminho e canal, concorrente e mídia nunca foram combinados numa conta só.</p>',
    resultAg:'<div class="h"><h3>Resposta do orquestrador</h3><span>{min} min · 1 pedido · {q} consultas · {tok} tokens</span></div>'+
      '<p><span class="pill good">hipótese 1 · confiança 87%</span><b>20% é o teto</b> em supermercado: a curva achata (lift 1,52 → 1,64 de 20% a 40%), a margem total é máxima em 20% (+14%) e o concorrente só reage acima de 25%.</p>'+
      '<p><span class="pill good">hipótese 2 · confiança 80%</span>campanha junto vale mais que desconto extra: a 20%, mídia na rede leva o lift de 1,36 para 1,55 a 1,62. <b>Ressalva do auditor:</b> sem Black Friday o efeito cai de 0,26 para 0,19.</p>'+
      '<p><span class="pill good">hipótese 3 · confiança 84%</span>atacarejo antecipa compra (6,4 un/nota, cai 18% abaixo da base por 3 semanas): só 10%. Farmácia não responde: sem promoção. "Caçadores de promoção" respondem 3x mais que "sensíveis declarados".</p>'+
      '<p><span class="pill good">ação</span>calendário com 20% em supermercado e campanha casada, 10% em atacarejo, zero em farmácia, nas audiências <b>Caçadores de promoção em limpeza</b> (6,7 mi) e <b>Visitantes de supermercados</b> (38,4 mi).</p>',
    compareChat:{1:'9',2:'61 min',3:'5, sob demanda da pessoa',4:'Nenhuma: só as que a pessoa pediu',5:'Não: cada resposta trata uma hipótese',6:'Curva de preço saiu do contexto no minuto 40',7:'Não: "entre 20% e 30%", sem canal',8:'Não: "teste controlado"',10:'Não: quem respondeu foi quem conferiu'},
    c4:'5: volume sem normalizar, atacarejo como consumo, correlação semanal, sazonalidade na mídia, sobreposição de audiências',
    c7:'Sim: 20% em supermercado com mídia, 10% em atacarejo, zero em farmácia',
    c8:'Sim, calendário por canal com duas audiências',
    c10:'Sim: auditor refez a margem por faixa e o efeito da mídia, e achou uma ressalva (Black Friday)',
    foot:'Todos os dados vêm das bases HYPR: notas fiscais, lugares, audiências, performance das campanhas na rede e pesquisas. Custo unitário é dado do cliente.'
  };
})();
