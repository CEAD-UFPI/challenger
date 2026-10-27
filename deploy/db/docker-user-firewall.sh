#!/bin/sh
# Libera a porta 5433 (banco do Challenger) somente para o servidor de aplicação.
# Docker ignora o ufw para portas publicadas; por isso a regra vai na cadeia DOCKER-USER.
# Não afeta a porta 5432 (OLICMAT).
APP_IP=10.42.90.243
RULE="-p tcp -m conntrack --ctorigdstport 5433 ! -s $APP_IP -j DROP"
iptables -C DOCKER-USER $RULE 2>/dev/null || iptables -I DOCKER-USER $RULE
