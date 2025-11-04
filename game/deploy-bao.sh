rm -r ../../websites/GiovanniScarpellino.github.io/bao
mv dist ../../websites/GiovanniScarpellino.github.io/bao
cd ../../websites/GiovanniScarpellino.github.io/bao
git add -A
git commit -m "Update BAO"
git push origin master
echo "Mise à jour ok"