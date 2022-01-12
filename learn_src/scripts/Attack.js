const { ethers } = require('hardhat')

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

hack = async () => {
    let Guesser, guesser, Attack, attack, signers, victim, hacker, overrides, victimBalance, hackerBalance

    signers = await ethers.getSigners()
    victim = signers[0]
    hacker = signers[1]

    console.log("I am the victim and I am deploying my vulnerable contract:")
    Guesser = await ethers.getContractFactory('Guesser')
    overrides = {
        value: ethers.utils.parseEther("0.001")
    }
    guesser = await Guesser.deploy(overrides)
    console.log("The vulnerable contract was deployed to " + guesser.address)
    console.log("-----------------------------------------------")

    console.log("I am the hacker and I am deploying my attack contract:")
    Attack = await ethers.getContractFactory("Attack")
    attack = await Attack.connect(hacker).deploy()
    console.log("The attack contract was deployed to " + attack.address)
    console.log("-----------------------------------------------")

    victimBalance = await guesser.getBalance()
    hackerBalance = await attack.getBalance()
    console.log("The victim has " + victimBalance + " MATICs")
    console.log("The hacker has " + hackerBalance + " MATICs")
    console.log("-----------------------------------------------")

    console.log("The hacker is about to hack()")
    overrides = {
        value: ethers.utils.parseEther("0.001"),
        from: hacker.address
    }
    await attack.connect(hacker).hack(guesser.address, overrides)
    console.log("-----------------------------------------------")

    console.log("The hack is over:")
    await sleep(20000)
    victimBalance = await guesser.getBalance()
    hackerBalance = await attack.getBalance()
    console.log("The victim has " + victimBalance + " MATICs")
    console.log("The hacker has " + hackerBalance + " MATICs")
}
hack()